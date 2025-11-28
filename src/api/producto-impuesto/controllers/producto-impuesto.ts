import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';

async function getOwnerIdFromProducto(productoId: number) {
  const producto = await strapi.db.query('api::producto.producto').findOne({
    where: { id: productoId },
    populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } },
  });
  return producto?.tienda?.[OWNER_FIELD_NAME]?.id;
}

export default factories.createCoreController('api::producto-impuesto.producto-impuesto', ({ strapi }) => ({

  async validateOwner(ctx, next) {
    const userId = ctx.state.user.id;
    const { id: productoImpuestoId } = ctx.params;

    const item = await strapi.db.query('api::producto-impuesto.producto-impuesto').findOne({
      where: { id: productoImpuestoId },
      populate: { producto: { populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } } } },
    });

    if (!item) return;

    const owner = item.producto?.tienda?.[OWNER_FIELD_NAME];
    if (owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso en este registro.');
    }

    if (typeof next === 'function') {
      return next();
    }
  },

 async create(ctx) {
    const userId = ctx.state.user.id;
    const { producto: productoId, impuesto: impuestoId } = ctx.request.body.data;
    if (!productoId || !impuestoId) {
      return ctx.badRequest('Debes seleccionar un Producto y un Impuesto obligatoriamente.');
    }

    const ownerId = await getOwnerIdFromProducto(Number(productoId));
    if (ownerId !== userId) {
      return ctx.forbidden('No tienes permiso para añadir impuestos a este producto.');
    }

    return super.create(ctx);
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    
    ctx.query.filters = {
      ...((typeof ctx.query.filters === 'object' && ctx.query.filters !== null) ? ctx.query.filters : {}),
      producto: {
        tienda: {
          [OWNER_FIELD_NAME]: {
            id: userId,
          },
        },
      },
    };

    try {
      const entities = await strapi.entityService.findMany('api::producto-impuesto.producto-impuesto', {
        ...ctx.query, 
        filters: ctx.query.filters,
        // 👇👇👇 ESTA LÍNEA ES LA SOLUCIÓN 👇👇👇
        populate: ['impuesto'], 
      });
      
      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);

    } catch (error) {
      return ctx.badRequest('Error al buscar impuestos.');
    }
  },

  async findOne(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    return super.findOne(ctx);
  },

  async update(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    return super.update(ctx);
  },

  async delete(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    return super.delete(ctx);
  },
}));