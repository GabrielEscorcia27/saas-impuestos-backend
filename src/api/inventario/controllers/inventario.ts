import { factories } from '@strapi/strapi';

const OWNER_FIELD_NAME = 'users_permissions_user';

// Helper para Producto
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

// Helper para Sucursal
async function getSucursalData(sucursalId: number) {
  const sucursal = await strapi.db.query('api::sucursal.sucursal').findOne({
    where: { id: sucursalId },
    populate: { tienda: { populate: { [OWNER_FIELD_NAME]: true } } },
  });
  return {
    ownerId: sucursal?.tienda?.[OWNER_FIELD_NAME]?.id,
    tiendaId: sucursal?.tienda?.id
  };
}

export default factories.createCoreController('api::inventario.inventario', ({ strapi }) => ({

  /**
   * HELPER: VALIDATE ACTIVE SESSION
   * Verifica que el session_id del token coincida con el de la BD.
   */
  async validateActiveSession(ctx) {
    const user = ctx.state.user as any; // 'as any' para evitar error TS

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

    return true;
  },

  /**
   * HELPER: VALIDATE OWNER
   */
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

  async create(ctx) {
    // 1. Validar Sesión
    const sessionValid = await this.validateActiveSession(ctx, undefined);
    if (sessionValid !== true) return sessionValid;

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
    // 1. Validar Sesión
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