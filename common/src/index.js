import ServerMicro from './helpers/ServerMicro';
import LangMicro from './lang/LangMicro';
import ConfigPostgres from './config/postgres';
import ConfigError from './config/error';
import ConfigDomain from './config/domain';
import ConfigAuth0 from './config/auth0';
import ConfigAuth0Web from './config/auth0Web';
import ConfigApp from './config/app';
import ConfigRedis from './config/redis';
import ConfigQueue from './config/queue';
import ConfigSocket from './config/socket';

export default {
    ServerMicro,
    LangMicro,
    ConfigPostgres,
    ConfigError,
    ConfigDomain,
    ConfigAuth0,
    ConfigAuth0Web,
    ConfigApp,
    ConfigRedis,
    ConfigQueue,
    ConfigSocket
};