const { z } = require('zod');

const email = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Email invalido')
  .max(160)
  .transform((value) => value.toLowerCase());

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80),
  email,
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .max(72, 'La contrasena no puede superar 72 caracteres'),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contrasena es obligatoria').max(72),
});

module.exports = { loginSchema, registerSchema };
