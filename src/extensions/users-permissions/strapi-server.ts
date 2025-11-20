import { randomUUID } from 'crypto';

export default (plugin) => {
  // Validación de seguridad: si el plugin no cargó bien, no hacemos nada
  if (!plugin.controllers || !plugin.controllers.auth) {
    return plugin;
  }

  const originalCallback = plugin.controllers.auth.callback;

  // Sobrescribimos la función de login ('callback')
  plugin.controllers.auth.callback = async (ctx) => {
    try {
      const originalSend = ctx.send;
      let loginResult = null;

      // Interceptamos la respuesta original de Strapi
      ctx.send = (body) => {
        loginResult = body;
      };
      
      // Ejecutamos el login normal
      await originalCallback(ctx);
      
      // Restauramos la función send
      ctx.send = originalSend;
      
      // Si el login fue exitoso (tenemos JWT y usuario)
      if (loginResult && loginResult.jwt && loginResult.user) {
        const newSessionId = randomUUID();
        const userId = loginResult.user.id;

        // 1. Guardamos el nuevo session_id en la base de datos
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { session_id: newSessionId },
        });

        // 2. Generamos un NUEVO token que incluye el session_id dentro
        const newJwt = strapi.plugin('users-permissions').service('jwt').issue({
          id: userId,
          session_id: newSessionId, // <--- Esto es clave para la validación
        });

        // 3. Devolvemos al usuario el nuevo token seguro
        return ctx.send({
          jwt: newJwt,
          user: loginResult.user,
        });
      } else {
        // Si el login falló, devolvemos el error original
        return ctx.send(loginResult);
      }
    } catch (error) {
      return ctx.badRequest(error.message);
    }
  };

  return plugin;
};