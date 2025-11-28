import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';

export default factories.createCoreController('api::tienda.tienda', ({ strapi }) => ({

  // Validación de Propiedad (MEJORADA: Usa entityService)
  async validateOwner(ctx, next) {
    const userId = ctx.state.user.id;
    const { id: tiendaId } = ctx.params;

    // Usamos entityService que es más robusto para relaciones
    const tienda = await strapi.entityService.findOne('api::tienda.tienda', tiendaId, {
      populate: [OWNER_FIELD_NAME], 
    });

    if (!tienda) {
      return ctx.notFound();
    }

    const owner = tienda[OWNER_FIELD_NAME];
    
    // Debug por si falla
    if (owner?.id !== userId) {
      console.log(`⛔ Bloqueo: Tienda ${tiendaId} (Dueño ${owner?.id}) vs Usuario ${userId}`);
      return ctx.forbidden('No tienes permiso en esta tienda');
    }

    if (typeof next === 'function') {
      return next();
    }
  },

  async create(ctx) {
    const userId = ctx.state.user.id;
    const response = await super.create(ctx);
    const nuevaTiendaId = response.data.id;

    try {
      await strapi.entityService.update('api::tienda.tienda', nuevaTiendaId, {
        data: { [OWNER_FIELD_NAME]: userId },
      });
    } catch (e) {
      await strapi.entityService.delete('api::tienda.tienda', nuevaTiendaId);
      return ctx.internalServerError('Error al vincular tienda.');
    }
    return response;
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    const existingFilters = ctx.query && typeof ctx.query.filters === 'object' && ctx.query.filters !== null
      ? ctx.query.filters
      : {};
    ctx.query.filters = {
      ...existingFilters,
      [OWNER_FIELD_NAME]: { id: userId },
    };
    // Usamos super.find aquí si el filtro está bien inyectado, o entityService
    // Para consistencia con tu código anterior:
    const entities = await strapi.entityService.findMany('api::tienda.tienda', {
      ...ctx.query,
      filters: ctx.query.filters
    });
    const sanitized = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitized);
  },

  async findOne(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    // Recuperamos directo para evitar filtros de draft ocultos
    const { id } = ctx.params;
    const entity = await strapi.entityService.findOne('api::tienda.tienda', id, {
      populate: ['sucursals', 'productos']
    });
    const sanitized = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    return await super.update(ctx);
  },

  async delete(ctx) {
    await this.validateOwner(ctx, () => Promise.resolve());
    return await super.delete(ctx);
  },

}));