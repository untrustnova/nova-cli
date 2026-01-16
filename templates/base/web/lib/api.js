const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = {
  async get(path) {
    const response = await fetch(`${baseUrl}${path}`);
    return response.json();
  },
};
