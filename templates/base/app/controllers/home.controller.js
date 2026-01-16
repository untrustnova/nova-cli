import { Controller } from '@untrustnova/nova-framework/controller';

export default class HomeController extends Controller {
  async index({ response }) {
    response.json({ message: 'Welcome to Nova.js', status: 'ok' });
  }
}
