CREATE TABLE public.sessions (
    id bigint NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    rules character varying NOT NULL,
    token character varying NOT NULL UNIQUE
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;