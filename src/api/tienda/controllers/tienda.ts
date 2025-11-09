// src/api/tienda/controllers/tienda.ts

import { factories } from '@strapi/strapi';
import { Context } from 'koa'; // Importamos Context de Koa para tipado

// Definición simple del tipo para la query de filtros
interface FilterableQuery {
  filters?: Record<string, any>;
  [key: string]: any;
}

export default factories.createCoreController('api::tienda.tienda', ({ strapi }) => ({

  /**
   * Sobrescribe la acción 'create' (Crear).
   * Asigna la tienda al usuario que la está creando.
   */
  async create(ctx) {
    // 1. Obtener el ID del usuario autenticado
    const userId = ctx.state.user.id;

    // 2. Inyectar el ID del usuario como 'owner'
    ctx.request.body.data = {
      ...ctx.request.body.data,
      owner: userId,
    };

    // 3. Llamar a la lógica de 'create' original
    const response = await super.create(ctx);
    return response;
  },

  /**
   * Sobrescribe la acción 'find' (Listar).
   * Filtra la lista para que solo muestre las tiendas del usuario actual.
   */
  async find(ctx: Context) {
    // 1. Obtener el ID del usuario autenticado
    const userId = ctx.state.user.id;

    // 2. Coerción de tipo y solución al TS2698: 
    // Aseguramos que 'ctx.query' es tratado como un objeto con un campo 'filters'.
    const query = ctx.query as FilterableQuery;
    
    // Si no existen filtros, los inicializamos como objeto vacío.
    query.filters = query.filters || {};

    // 3. Añadir el filtro de propiedad al objeto filters
    query.filters = {
      ...query.filters, // Ahora TypeScript sabe que esto es un objeto
      owner: userId,
    };
    
    // 4. Actualizar el contexto de la petición
    ctx.query = query as any; // Volvemos a asignarlo al contexto

    // 5. Llamar a la lógica 'find' original con el filtro aplicado
    const response = await super.find(ctx);
    return response;
  },

  /**
   * Sobrescribe 'findOne', 'update', y 'delete' para validar la propiedad.
   */
  async findOne(ctx) {
    await this.validateOwner(ctx);
    return super.findOne(ctx);
  },

  async update(ctx) {
    await this.validateOwner(ctx);
    return super.update(ctx);
  },

  async delete(ctx) {
    await this.validateOwner(ctx);
    return super.delete(ctx);
  },

  /**
   * Función de ayuda personalizada para validar la propiedad.
   */
  async validateOwner(ctx) {
    const userId = ctx.state.user.id;
    const { id: tiendaId } = ctx.params;

    // Buscar la tienda y su dueño
    const tienda = await strapi.db.query('api::tienda.tienda').findOne({
      where: { id: tiendaId },
      populate: ['owner'],
    });

    if (!tienda) {
      return;
    }

    // Si el dueño de la tienda NO es el usuario autenticado
    if (tienda.owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en esta tienda.');
    }
  }

}));