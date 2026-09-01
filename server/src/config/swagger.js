const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Gym Rocks Fitness API',
      version: '1.0.0',
      description:
        'Gym Management & Automation Platform — covers all 14 SRS features: ' +
        'authentication, members, memberships, attendance, trainer/workout ' +
        'programs, nutrition, workout logging, progress, exercise library, ' +
        'booking, payments, analytics, notifications, and inquiries.',
    },
    servers: [{ url: '/api/v1', description: 'API base path' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Shared shapes referenced across multiple modules via $ref.
        ErrorResponse: {
          type: 'object',
          properties: {
            data: { type: 'null', example: null },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 42 },
            total_pages: { type: 'integer', example: 3 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }], // default — individual public routes override with security: []
  },
  // Every *.routes.js file's JSDoc comments get scanned. As new modules
  // are documented, no changes needed here — this glob already covers
  // every route file in the project.
  apis: ['./src/modules/**/*.routes.js'],
};

module.exports = swaggerJsdoc(options);
