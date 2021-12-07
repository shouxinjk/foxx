'use strict';
module.context.use('/platform_properties', require('./routes/platform_properties'), 'platform_properties');
module.context.use('/properties', require('./routes/properties'), 'properties');
