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

  async validateActiveSession(ctx, next?: any) {
    const user = ctx.state.user as any;

    if (!user || !user.session_id) {
      return ctx.unauthorized('Token de sesión inválido. Por favor, inicie sesión de nuevo.');
    }

    const dbUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      select: ['session_id'],
    });

    if (!dbUser || dbUser.session_id !== user.session_id) {
      return ctx.unauthorized('Sesión expirada. Ha iniciado sesión en otro dispositivo.');
    }

    if (typeof next === 'function') {
      return next();
    }

    return true;
  },

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
      return ctx.forbidden('No tienes permiso para realizar esta acción en este registro.');
    }

    if (typeof next === 'function') {
      return next();
    }
  },

  async create(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    const userId = ctx.state.user.id;
    const productoId = ctx.request.body.data.producto;

    if (!productoId) return ctx.badRequest('El ID del producto es requerido.');

    const ownerId = await getOwnerIdFromProducto(Number(productoId));
    if (ownerId !== userId) {
      return ctx.forbidden('No tienes permiso para añadir impuestos a este producto.');
    }

    return super.create(ctx);
  },

  async find(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

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
      });
      
      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);

    } catch (error) {
      if (error.name === 'ValidationError') {
        return ctx.badRequest(error.message, error.details);
      }
      return ctx.internalServerError('Error al buscar impuestos de producto.', error.message);
    }
  },

  async findOne(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    await this.validateOwner(ctx, () => Promise.resolve());
    return super.findOne(ctx);
  },

  async update(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    await this.validateOwner(ctx, () => Promise.resolve());
    return super.update(ctx);
  },

  async delete(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    await this.validateOwner(ctx, () => Promise.resolve());
    return super.delete(ctx);
  },

}));