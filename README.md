## About the project

This is a service that makes it easier to share sensitive information via untrusted protocols such as email.
It encrypts the message using a key that's unique to each entry and creates a one-time decryption link.

Since none of the keys are stored anywhere, only someone with access to the link can read the message.

## Installation and use

### The backend service

Either MongoDB or PostgreSQL can be used as storage, but only the module for MongoDB is installed by default.

To use PostgreSQL, install the `pg` module using `npm install --save pg` and create a table with the following command:

```pgsql
CREATE TABLE passwords (
    id character varying NOT NULL PRIMARY KEY,
    data bytea,
    expires timestamp with time zone
);
```

After renaming `config.ts.dist` to `config.ts` and editing the configuration values, the project can be built with the command `npm run build`.

When running the service as a Cloud Function in GCP, the `handle` function in `dist/server/function.js` will be used as the entry point:

```
gcloud functions deploy <name> --runtime=nodejs20 --trigger-http --entry-point=handle
```

For other hosting solutions, the Express server instance in [src/index.ts](index.ts) should be a good starting point.

### The web frontend

To use the web interface, replace the `API_URL` placeholder in [webpack.config.js](webpack.config.js#L1) with the correct URL to the backend service and run `npm run build:static`. The `dist/static` folder can then be deployed as a static site on any hosting provider or used directly with a local web browser. It can also be served from the backend service, which may be preferable on VPS-like hosting solutions. The URL to access it is then the same as `API_URL` (i.e. [http://localhost:8080](http://localhost:8080) with the default configuration).

### The CLI frontend

To use the command-line interface, follow the instructions above for the backend service and run `node dist/server help` to see a list of supported commands.

### Removing expired entries

To remove old entries, send an HTTP request with the DELETE method and no body parameters to the backend. It can also be done using the CLI frontend with the command `node dist/server delete`.
