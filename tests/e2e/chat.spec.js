const { test, expect } = require('@playwright/test');

test.describe('Pruebas End-to-End con Playwright - Chat UNA', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Enviar una URL de imagen y verificar que la imagen se muestra y termina de cargar', async ({ page }) => {
    const imageUrl = 'https://www.w3schools.com/howto/img_avatar.png';

    await page.getByPlaceholder('Username').fill('Billy');
    await page.getByPlaceholder('Escriba un mensaje o pegue una URL').fill(imageUrl);
    await page.getByRole('button', { name: 'Send' }).click();

    // Localizar imagen con getByRole
    const img = page.getByRole('img', { name: 'Imagen compartida' });
    await expect(img).toBeVisible();

    // Verificar que termina de cargar en el navegador
    await expect(img).toHaveJSProperty('complete', true);
    const naturalWidth = await img.evaluate((el) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('Enviar una URL de video y verificar que el reproductor aparece y carga el contenido', async ({ page }) => {
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';

    await page.getByPlaceholder('Username').fill('Billy');
    await page.getByPlaceholder('Escriba un mensaje o pegue una URL').fill(videoUrl);
    await page.getByRole('button', { name: 'Send' }).click();

    // Verificar que el reproductor <video> aparece
    const video = page.locator('#messages video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('src', videoUrl);
  });

  test('Enviar el script del paso 2, registrar dialog para alert y verificar rechazo', async ({ page }) => {
    // Registrar page.on('dialog') antes del envío para detectar el alert y hacer fallar la prueba
    let dialogDisparado = false;
    page.on('dialog', async (dialog) => {
      dialogDisparado = true;
      await dialog.dismiss();
    });

    const scriptMalicioso = '<script>alert(1)</script>';

    await page.getByPlaceholder('Username').fill('Atacante');
    await page.getByPlaceholder('Escriba un mensaje o pegue una URL').fill(scriptMalicioso);
    await page.getByRole('button', { name: 'Send' }).click();

    // Comprobar el rechazo en la interfaz: aparece el aviso de error
    const chatError = page.locator('#chat-error');
    await expect(chatError).toBeVisible();
    await expect(chatError).toContainText('No se permite HTML');

    // Comprobar que NUNCA saltó el alert (la prueba fallaría si dialogDisparado fuera true)
    expect(dialogDisparado).toBe(false);

    // Comprobar que el mensaje no se agregó al chat
    const messages = page.locator('#messages');
    await expect(messages).not.toContainText('<script>');
  });

});
