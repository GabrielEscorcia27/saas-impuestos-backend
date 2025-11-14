import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';
async function getOwnerIdFromTienda(tiendaId: number) {
  const tienda = await strapi.db.query('api::tienda.tienda').findOne({
    where: { id: tiendaId },
    populate: [OWNER_FIELD_NAME],
  });

  return tienda?.[OWNER_FIELD_NAME]?.id;
}

export default factories.createCoreController('api::sucursal.sucursal', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user.id;
    const tiendaId = ctx.request.body.data.tienda;

    if (!tiendaId) {
      return ctx.badRequest('El ID de la tienda es requerido.');
    }

    const ownerId = await getOwnerIdFromTienda(Number(tiendaId));
    if (ownerId !== userId) {
      return ctx.forbidden('No tienes permiso para crear sucursales en esta tienda.');
    }

    return super.create(ctx);
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    ctx.query.filters = {
      ...((typeof ctx.query.filters === 'object' && ctx.query.filters !== null) ? ctx.query.filters : {}),
      tienda: {
        [OWNER_FIELD_NAME]: {
          id: userId,
        },
      },
    };

    try {
      const entities = await strapi.entityService.findMany('api::sucursal.sucursal', {
        ...ctx.query, 
        filters: ctx.query.filters, 
      });
      
      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);

    } catch (error) {
      if (error.name === 'ValidationError') {
        return ctx.badRequest(error.message, error.details);
      }
      return ctx.internalServerError('Error al buscar sucursales.', error.message);
    }
  },

  async validateOwner(ctx, next) {
    const userId = ctx.state.user.id;
    const { id: sucursalId } = ctx.params;

    const sucursal = await strapi.db.query('api::sucursal.sucursal').findOne({
      where: { id: sucursalId },
      populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } },
    });

    if (!sucursal) {
      return; 
    }

    const owner = sucursal.tienda?.[OWNER_FIELD_NAME];
    if (owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en esta sucursal.');
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