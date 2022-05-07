import { ServiceAccountCert, ServiceAccountDatabaseURL } from '@tomrot/common';
var admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert(ServiceAccountCert),
    databaseURL: ServiceAccountDatabaseURL
});

export default admin;