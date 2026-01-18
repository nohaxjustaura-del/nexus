-- Give 10,000 credits to admin user
UPDATE UserCredits 
SET credits = 10000 
WHERE userId IN (
  SELECT id FROM User WHERE email = 'nohaxjustaura@gmail.com'
);
