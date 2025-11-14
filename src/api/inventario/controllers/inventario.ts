import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';
async function getProductoData(productoId: number) {
  const producto = await strapi.db.query('api::producto.producto').findOne({
    where: { id: productoId },
    populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } },
  });
  return {
    ownerId: producto?.tienda?.[OWNER_FIELD_NAME]?.id,
    tiendaId: producto?.tienda?.id
  };
}

async function getSucursalData(sucursalId: number) {
  const sucursal = await strapi.db.query('api::sucursal.sucursal').findOne({
    where: { id: sucursalId },
    populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } },
  });
  return {
    // Corregido: Accede al owner a través de la tienda de la sucursal
    ownerId: sucursal?.tienda?.[OWNER_FIELD_NAME]?.id,
    tiendaId: sucursal?.tienda?.id
  };
}


export default factories.createCoreController('api::inventario.inventario', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user.id;
    const { producto: productoId, sucursal: sucursalId } = ctx.request.body.data;

    if (!productoId || !sucursalId) {
      return ctx.badRequest('Se requieren tanto el ID de producto como el de sucursal.');
    }

    const productoData = await getProductoData(Number(productoId));
    const sucursalData = await getSucursalData(Number(sucursalId));

    if (productoData.ownerId !== userId || sucursalData.ownerId !== userId) {
      return ctx.forbidden('No tienes permiso sobre el producto o la sucursal.');
    }

    if (productoData.tiendaId !== sucursalData.tiendaId) {
      return ctx.badRequest('El producto y la sucursal no pertenecen a la misma tienda.');
    }

    return super.create(ctx);
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    ctx.query.filters = {
      ...((typeof ctx.query.filters === 'object' && ctx.query.filters !== null) ? ctx.query.filters : {}),
      // Filtramos por el producto, es suficiente para la seguridad
      producto: {
        tienda: {
          [OWNER_FIELD_NAME]: {
            id: userId,
          },
        },
      },
    };

    try {
      const entities = await strapi.entityService.findMany('api::inventario.inventario', {
        ...ctx.query, 
        filters: ctx.query.filters, 
      });
      
      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);

    } catch (error) {
      if (error.name === 'ValidationError') {
        return ctx.badRequest(error.message, error.details);
      }
      return ctx.internalServerError('Error al buscar inventario.', error.message);
    }
  },

  async validateOwner(ctx, next) {
    const userId = ctx.state.user.id;
    const { id: inventarioId } = ctx.params;

    const item = await strapi.db.query('api::inventario.inventario').findOne({
      where: { id: inventarioId },
      populate: { producto: { populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } } } },
    });

    if (!item) {
      return;
    }

    const owner = item.producto?.tienda?.[OWNER_FIELD_NAME];
    if (owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en este registro.');
    }

    if (typeof next === 'function') {
      return next();
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
