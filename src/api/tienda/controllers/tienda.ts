import { factories } from '@strapi/strapi';
import { nextTick } from 'process';

// Este es el nombre de campo correcto de tu modelo 'Tienda'
const OWNER_FIELD_NAME = 'users_permissions_user';

export default factories.createCoreController('api::tienda.tienda', ({ strapi }) => ({

  /**
   * HELPER 1: VALIDATE ACTIVE SESSION (Paso 8)
   */
  async validateActiveSession(ctx) {
    const user = ctx.state.user;
    
    // 1. Revisa si el token tiene el session_id
    if (!user || !user.session_id) {
      return ctx.unauthorized('Token de sesión inválido. Por favor, inicie sesión de nuevo.');
    }

    // 2. Compara el session_id del token con el de la BD
    const dbUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      select: ['session_id'], // Solo pedimos el campo que necesitamos
    });

    // 3. Si no coinciden, es una sesión antigua
    if (!dbUser || dbUser.session_id !== user.session_id) {
      return ctx.unauthorized('Sesión expirada. Ha iniciado sesión en otro dispositivo.');
    }

    return true; // La sesión es válida
  },

  /**
   * HELPER 2: VALIDATE OWNERSHIP (Paso 4/5 Corregido)
   */
  async validateOwner(ctx) {
    const userId = ctx.state.user.id;
    const { id: tiendaId } = ctx.params;

    const tienda = await strapi.db.query('api::tienda.tienda').findOne({
      where: { id: tiendaId },
      populate: [OWNER_FIELD_NAME], // Poblar el campo de relación
    });

    if (!tienda) {
      return; // Dejar que super.findOne maneje el 404
    }

    const owner = tienda[OWNER_FIELD_NAME];
    if (owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en esta tienda.');
    }

    return true; // Propiedad válida
  },

  /**
   * CREATE: Combina Sesión + Lógica Create-Update
   */
  async create(ctx, next) { 
    const sessionError = await this.validateActiveSession(ctx);
      if  (sessionError !== true) return sessionError;

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

  /**
   * FIND: Combina Sesión + Lógica entityService (con tu typeof)
   */
  async find(ctx, next) {
  const sessionError = await this.validateActiveSession(ctx);
  if (sessionError !== true) return sessionError;
    
    const userId = ctx.state.user.id;
    
    // 1. Añadir nuestro filtro de propietario a los filtros existentes
    ctx.query.filters = {
      ...((typeof ctx.query.filters === 'object' && ctx.query.filters !== null) ? ctx.query.filters : {}),
      [OWNER_FIELD_NAME]: {
        id: userId,
      },
    };

    // 2. Llamar a entityService.findMany directamente
    try {
      const entities = await strapi.entityService.findMany('api::tienda.tienda', {
        ...ctx.query, // Pasa todos los query params (sort, pagination, etc.)
        filters: ctx.query.filters, // Pasa nuestros filtros modificados
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

  /**
   * FINDONE: Combina Sesión + Propiedad
   */
  async findOne(ctx) {
    const sessionError = await this.validateActiveSession(ctx);
    if (sessionError !== true) return sessionError;

    const ownerError = await this.validateOwner(ctx);
    if (ownerError !== true) return ownerError;

    return super.findOne(ctx);
  },

  /**
   * UPDATE: Combina Sesión + Propiedad
   */
  async update(ctx) {
    const sessionError = await this.validateActiveSession(ctx);
    if (sessionError !== true) return sessionError;

    const ownerError = await this.validateOwner(ctx);
    if (ownerError !== true) return ownerError;

    return super.update(ctx);
  },

  /**
   * DELETE: Combina Sesión + Propiedad
   */
  async delete(ctx) {
    const sessionError = await this.validateActiveSession(ctx);
    if (sessionError !== true) return sessionError;

    const ownerError = await this.validateOwner(ctx);
    if (ownerError !== true) return ownerError;

    return super.delete(ctx);
  },
}));