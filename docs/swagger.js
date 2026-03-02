const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EKam Admin API',
      version: '1.0.0',
      description: 'Multi-tenant partner admin portal API. All endpoints use **POST only** — no data is passed via URL query strings or path parameters. This ensures sensitive data stays in the encrypted request body and never appears in server logs, browser history, or proxy caches.',
      contact: { name: 'EKam Admin', email: 'admin@ekam.com' }
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Local Development' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Partner API key'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Dashboard', description: 'Dashboard metrics & activity' },
      { name: 'Profiles', description: 'Profile management (CRUD)' },
      { name: 'Partner', description: 'Partner info & domain links' },
      { name: 'Background Check', description: 'Background check operations' }
    ],
    paths: {
      // ─── AUTH ──────────────────────────────────────────
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description: 'Authenticate with username, password, and API key. Returns JWT token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password', 'apiKey'],
                  properties: {
                    username: { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'Admin@123' },
                    apiKey: { type: 'string', example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      token: { type: 'string', description: 'JWT token' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          username: { type: 'string' },
                          role: { type: 'string', enum: ['partner-admin', 'account-admin', 'support-admin'] },
                          partnerId: { type: 'integer' },
                          partnerName: { type: 'string' },
                          partnerDomain: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/auth/domains': {
        post: {
          tags: ['Auth'],
          summary: 'Get partner domains',
          description: 'Returns list of active partner domains for the login dropdown.',
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            200: {
              description: 'List of domains',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            partner_name: { type: 'string' },
                            api_key: { type: 'string' },
                            partner_root_domain: { type: 'string' },
                            business_name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/auth/verify': {
        post: {
          tags: ['Auth'],
          summary: 'Verify JWT token',
          description: 'Validates the current JWT token and returns user info.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            200: { description: 'Token is valid', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessResponse' } } } },
            401: { description: 'Token missing' },
            403: { description: 'Token invalid or expired' }
          }
        }
      },
      // ─── DASHBOARD ─────────────────────────────────────
      '/dashboard/metrics': {
        post: {
          tags: ['Dashboard'],
          summary: 'Get dashboard metrics',
          description: 'Returns aggregated metrics: profiles, payments, activity, views, accounts.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: {
            200: {
              description: 'Dashboard metrics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          profiles: { type: 'object', properties: { total_profiles: { type: 'integer' }, active_profiles: { type: 'integer' }, male_profiles: { type: 'integer' }, female_profiles: { type: 'integer' } } },
                          payments: { type: 'object', properties: { total_payments: { type: 'integer' }, total_amount: { type: 'number' }, paid_amount: { type: 'number' } } },
                          activity: { type: 'object', properties: { total_activities: { type: 'integer' }, last_24h: { type: 'integer' }, last_7d: { type: 'integer' } } },
                          views: { type: 'object', properties: { total_views: { type: 'integer' }, views_7d: { type: 'integer' }, views_30d: { type: 'integer' } } },
                          accounts: { type: 'object', properties: { total_accounts: { type: 'integer' }, active_accounts: { type: 'integer' }, new_last_30d: { type: 'integer' } } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/dashboard/activities': {
        post: {
          tags: ['Dashboard'],
          summary: 'Get recent activities',
          description: 'Returns recent activity log entries for the partner.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'integer', default: 20, description: 'Number of records to return' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Recent activities list' } }
        }
      },
      // ─── PROFILES ──────────────────────────────────────
      '/profiles/list': {
        post: {
          tags: ['Profiles'],
          summary: 'List profiles',
          description: 'Returns paginated list of profiles for the partner with optional search.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', default: 1 },
                    limit: { type: 'integer', default: 20 },
                    search: { type: 'string', description: 'Search by name, email, or account code' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Paginated profile list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          profiles: { type: 'array', items: { type: 'object' } },
                          total: { type: 'integer' },
                          page: { type: 'integer' },
                          limit: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/profiles/detail': {
        post: {
          tags: ['Profiles'],
          summary: 'Get profile detail',
          description: 'Returns full profile including address, education, employment, family, photos, etc.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: { id: { type: 'integer', description: 'Profile ID' } }
                }
              }
            }
          },
          responses: {
            200: { description: 'Full profile data' },
            404: { description: 'Profile not found' }
          }
        }
      },
      '/profiles/create': {
        post: {
          tags: ['Profiles'],
          summary: 'Create profile',
          description: 'Creates a new account, profile personal record, and login credentials.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['first_name', 'last_name', 'email', 'gender', 'birth_date', 'phone_mobile', 'username', 'password'],
                  properties: {
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    middle_name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    gender: { type: 'integer', description: '1=Male, 2=Female' },
                    birth_date: { type: 'string', format: 'date' },
                    phone_mobile: { type: 'string' },
                    marital_status: { type: 'integer' },
                    religion: { type: 'integer' },
                    nationality: { type: 'integer' },
                    address_line1: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    zip: { type: 'string' },
                    country: { type: 'string' },
                    username: { type: 'string' },
                    password: { type: 'string' },
                    short_summary: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            201: { description: 'Profile created successfully' }
          }
        }
      },
      '/profiles/update': {
        post: {
          tags: ['Profiles'],
          summary: 'Update profile',
          description: 'Updates profile personal data. Only provided fields are updated (COALESCE pattern).',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: { type: 'integer', description: 'Profile ID' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    phone_mobile: { type: 'string' },
                    email_id: { type: 'string' },
                    marital_status: { type: 'integer' },
                    short_summary: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Profile updated' },
            404: { description: 'Profile not found' }
          }
        }
      },
      '/profiles/toggle-status': {
        post: {
          tags: ['Profiles'],
          summary: 'Toggle profile status',
          description: 'Activates or deactivates a profile.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'isActive'],
                  properties: {
                    id: { type: 'integer', description: 'Profile ID' },
                    isActive: { type: 'integer', enum: [0, 1] }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Status updated' } }
        }
      },
      '/profiles/lookups': {
        post: {
          tags: ['Profiles'],
          summary: 'Get lookup values',
          description: 'Returns lookup values (religion, caste, marital status, etc). Send empty body for all lookups or specify type.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', nullable: true, description: 'Lookup type filter (e.g. religion, caste)' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Lookup values' } }
        }
      },
      // ─── PARTNER ───────────────────────────────────────
      '/partner/info': {
        post: {
          tags: ['Partner'],
          summary: 'Get partner info',
          description: 'Returns the authenticated partner\'s business details.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'Partner info' } }
        }
      },
      '/partner/domain-links': {
        post: {
          tags: ['Partner'],
          summary: 'Get partner domain links',
          description: 'Returns partner website, social media, and admin URLs.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'Domain links' } }
        }
      },
      '/partner/countries': {
        post: {
          tags: ['Partner'],
          summary: 'Get countries',
          description: 'Returns list of countries for dropdowns.',
          security: [{ BearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'Countries list' } }
        }
      },
      '/partner/states': {
        post: {
          tags: ['Partner'],
          summary: 'Get states by country',
          description: 'Returns list of states for a given country.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['countryId'],
                  properties: { countryId: { type: 'integer' } }
                }
              }
            }
          },
          responses: { 200: { description: 'States list' } }
        }
      },
      // ─── BACKGROUND CHECK ──────────────────────────────
      '/background-check/profile': {
        post: {
          tags: ['Background Check'],
          summary: 'Get profile for background check',
          description: 'Returns profile details needed for initiating a background check.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['profileId'],
                  properties: { profileId: { type: 'integer' } }
                }
              }
            }
          },
          responses: {
            200: { description: 'Profile data for check' },
            404: { description: 'Profile not found' }
          }
        }
      },
      '/background-check/initiate': {
        post: {
          tags: ['Background Check'],
          summary: 'Initiate background check',
          description: 'Initiates a background check for a profile and logs the request.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['profileId', 'checkType'],
                  properties: {
                    profileId: { type: 'integer' },
                    checkType: { type: 'string', enum: ['identity', 'criminal', 'employment', 'education', 'comprehensive'] },
                    notes: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Check initiated' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'EKam Admin API Docs'
  }));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = { setupSwagger };
