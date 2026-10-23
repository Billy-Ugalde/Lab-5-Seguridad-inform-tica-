const request = require('supertest');
const server = require('../../server');
const unalib = require('../../libs/unalib');

describe('Pruebas de Integración - Backend y una-lib', () => {
  let validateSpy;

  beforeEach(() => {
    // Comprobar que el backend llama a validarMensaje / validateMessage de una-lib
    validateSpy = jest.spyOn(unalib, 'validateMessage');
  });

  afterEach(() => {
    if (validateSpy) {
      validateSpy.mockRestore();
    }
  });

  afterAll((done) => {
    // Al terminar, cerrar los servidores o conexiones que abrió la prueba
    if (server.http && server.http.listening) {
      server.http.close(done);
    } else {
      done();
    }
  });

  test('URL de imagen válida: el backend acepta el mensaje', async () => {
    const payload = {
      nombre: 'Billy',
      mensaje: 'https://example.com/foto.png'
    };

    const response = await request(server.app)
      .post('/mensaje')
      .send(payload)
      .expect(200);

    // Comprueba que el backend llama realmente a una-lib
    expect(validateSpy).toHaveBeenCalled();
    expect(response.body).toHaveProperty('media');
    expect(response.body.media).not.toBeNull();
    expect(response.body.media.tipo).toBe('imagen');
    expect(response.body.media.url).toBe('https://example.com/foto.png');
  });

  test('URL de video válida: el backend acepta el mensaje', async () => {
    const payload = {
      nombre: 'Billy',
      mensaje: 'https://example.com/clip.mp4'
    };

    const response = await request(server.app)
      .post('/mensaje')
      .send(payload)
      .expect(200);

    expect(validateSpy).toHaveBeenCalled();
    expect(response.body).toHaveProperty('media');
    expect(response.body.media).not.toBeNull();
    expect(response.body.media.tipo).toBe('video');
    expect(response.body.media.url).toBe('https://example.com/clip.mp4');
  });

  test('URL no permitida o script: la validación rechaza la entrada', async () => {
    const payload = {
      nombre: 'Atacante',
      mensaje: '<script>alert("xss")</script>'
    };

    const response = await request(server.app)
      .post('/mensaje')
      .send(payload)
      .expect(400);

    expect(validateSpy).toHaveBeenCalled();
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBeTruthy();
  });
});
