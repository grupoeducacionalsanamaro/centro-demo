import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Para publicar un artículo nuevo basta con crear un archivo .md en src/content/educacion/.
const educacion = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/educacion' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    especialidad: z.enum(['medicina-general', 'kinesiologia', 'odontologia', 'nutricion', 'psicologia', 'enfermeria']),
    autor: z.string(), // id del profesional en centro.json (por ejemplo, "matias-rivas")
    imagen: z.string().optional(), // nombre del archivo en public/images, sin extensión
    imagenAlt: z.string().optional(),
  }),
});

export const collections = { educacion };
