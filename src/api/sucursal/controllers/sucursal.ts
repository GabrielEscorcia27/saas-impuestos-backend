import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';

async function getOwnerIdFromTienda(tiendaId: number) {
  const tienda = await strapi.entityService.findOne('api::tienda.tienda', tiendaId, {
    populate: [OWNER_FIELD_NAME],
  });
  return tienda?.[OWNER_FIELD_NAME]?.id;
}

export default factories.createCoreController('api::sucursal.sucursal', ({ strapi }) => ({

  async create(ctx) {
    const userId = ctx.state.user.id;
    const tiendaId = ctx.request.body.data.tienda;

    if (!tiendaId) return ctx.badRequest('Falta ID de tienda');

    const ownerId = await getOwnerIdFromTienda(Number(tiendaId));
    if (ownerId !== userId) return ctx.forbidden('No puedes crear sucursales en tiendas ajenas');

    return super.create(ctx);
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    
    // --- CORRECCIÓN IMPORTANTE AQUÍ ---
    // Preservamos el filtro de 'tienda' que viene del frontend (params: filters[tienda][id]=X)
    // y le AGREGAMOS la restricción de dueño.
    
    const filters = (ctx.query.filters ?? {}) as Record<string, any>;
    const existingTiendaFilter = filters.tienda || {};

    ctx.query.filters = {
      ...filters,
      tienda: {
        ...existingTiendaFilter, // Mantenemos el ID de la tienda que pide el frontend
        [OWNER_FIELD_NAME]: {    // Y forzamos que el dueño seas tú
          id: userId,
        },
      },
    };

    const entities = await strapi.entityService.findMany('api::sucursal.sucursal', {
        ...ctx.query,
        filters: ctx.query.filters
    });
    const sanitized = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitized);
  },

}));