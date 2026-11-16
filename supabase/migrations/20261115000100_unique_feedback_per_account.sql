-- Cada conta avalia um produto no máximo uma vez. O índice único garante a regra
-- no banco, inclusive quando dois envios chegam ao mesmo tempo.
create unique index products_feedbacks_product_id_created_by_key
  on public.products_feedbacks (product_id, created_by);
