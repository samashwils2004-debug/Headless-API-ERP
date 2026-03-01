-- Supabase Storage policies for application-documents bucket.
-- Bucket should exist before running:
-- insert into storage.buckets (id, name, public) values ('application-documents', 'application-documents', false);

CREATE POLICY "documents_select_by_institution"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'institution_id')
);

CREATE POLICY "documents_insert_by_institution"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'institution_id')
);
