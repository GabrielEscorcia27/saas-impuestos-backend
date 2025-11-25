import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';

export default factories.createCoreController('api::tienda.tienda', ({ strapi }) => ({

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
    const { id: tiendaId } = ctx.params;

    const tienda = await strapi.db.query('api::tienda.tienda').findOne({
      where: { id: tiendaId },
      populate: [OWNER_FIELD_NAME], 
    });

    if (!tienda) return;

    const owner = tienda[OWNER_FIELD_NAME];
    if (owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en esta tienda.');
    }

    if (typeof next === 'function') {
      return next();
    }
  },

  async create(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    const userId = ctx.state.user.id;
    const response = await super.create(ctx);
    const nuevaTiendaId = response.data.id;

    try {
      await strapi.entityService.update('api::tienda.tienda', nuevaTiendaId, {
        data: {
          [OWNER_FIELD_NAME]: userId,
        },
      });
    } catch (e) {
      await strapi.entityService.delete('api::tienda.tienda', nuevaTiendaId);
      return ctx.internalServerError('Error al vincular el dueño. Se revirtió la creación.');
    }
    return response;
  },

  async find(ctx) {
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

    const userId = ctx.state.user.id;
    ctx.query.filters = {
      ...((typeof ctx.query.filters === 'object' && ctx.query.filters !== null) ? ctx.query.filters : {}),
      [OWNER_FIELD_NAME]: {
        id: userId,
      },
    };

    try {
      const entities = await strapi.entityService.findMany('api::tienda.tienda', {
        ...ctx.query, 
        filters: ctx.query.filters, 
      });
      const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
      return this.transformResponse(sanitizedEntities);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return ctx.badRequest(error.message, error.details);
      }
      return ctx.internalServerError('Error al buscar tiendas.', error.message);
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