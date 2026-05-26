create table if not exists stock_analyses (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  stock_data jsonb not null,
  ai_analysis jsonb not null,
  summary text not null,
  sentiment text not null check (sentiment in ('Bullish', 'Neutral', 'Bearish')),
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High')),
  created_at timestamptz default now()
);

create index if not exists stock_analyses_created_at_idx on stock_analyses (created_at desc);
create index if not exists stock_analyses_symbol_idx on stock_analyses (symbol);
