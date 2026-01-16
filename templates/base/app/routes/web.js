import { route } from '@untrustnova/nova-framework/routing';

export default () => {
  const routes = route();

  routes.get('/', 'HomeController@index');
  routes.get('/status', async ({ response }) => {
    response.json({ status: 'ready' });
  });

  return routes.toArray();
};
