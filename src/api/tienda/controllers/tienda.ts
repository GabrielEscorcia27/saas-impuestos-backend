import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tienda.tienda', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user.id;

    ctx.request.body.data = {
      ...ctx.request.body.data,
      owner: userId,
    };

    const response = await super.create(ctx);
    return response;
  },

  async find(ctx) {
    const userId = ctx.state.user.id;
    ctx.query.filters = {
      ...( (typeof ctx.query.filters === 'object' && ctx.query.filters !== null ? ctx.query.filters : {}) as Record<string, any> ),
      owner: userId,
    };

    const response = await super.find(ctx);
    return response;
  },
  
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

  async validateOwner(ctx) {
    const userId = ctx.state.user.id;
    const { id: tiendaId } = ctx.params;
    const tienda = await strapi.db.query('api::tienda.tienda').findOne({
      where: { id: tiendaId },
      populate: ['owner'],
    });

    if (!tienda) {
      return;
    }

    if (tienda.owner?.id !== userId) {
      return ctx.forbidden('No tienes permiso para realizar esta acción en esta tienda.');
    }
  }}));