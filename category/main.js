'use strict';

module.context.use('/platform_categories', require('./routes/platform_categories'), 'platform_categories');
module.context.use('/categories', require('./routes/categories'), 'categories');
