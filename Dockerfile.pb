FROM ghcr.io/muchobien/pocketbase:0.40.6@sha256:9a0be68a80ca1348ba8d15f217b3f983be4c094b3c571a09b3ebdeb357259338

COPY ./pb_migrations /pb_migrations
COPY ./pb_hooks /pb_hooks
