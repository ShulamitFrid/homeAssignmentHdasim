-- Create People table to store information about each individual
CREATE TABLE IF NOT EXISTS People (
    Person_Id INT PRIMARY KEY,             -- Unique identifier for each person
    Personal_Name VARCHAR(50),             -- First name
    Family_Name VARCHAR(50),               -- Last name
    Gender CHAR(1),                        -- 'M' for male, 'F' for female
    Father_Id INT NULL,                    -- ID of the father (nullable)
    Mother_Id INT NULL,                    -- ID of the mother (nullable)
    Spouse_Id INT NULL                     -- ID of the spouse (nullable)
);

-- Insert sample data into the People table
INSERT INTO People (Person_Id, Personal_Name, Family_Name, Gender, Father_Id, Mother_Id, Spouse_Id) VALUES
(111, 'David', 'Cohen', 'M', NULL, NULL, 222),
(222, 'Sarah', 'Cohen', 'F', NULL, NULL, NULL),
(333, 'Michael', 'Cohen', 'M', 111, 222, NULL),
(444, 'Rachel', 'Cohen', 'F', 111, 222, NULL);

--Ex1.
-- Create the Family_Tree table to store direct relationships between individuals
CREATE TABLE IF NOT EXISTS Family_Tree (
    Person_Id INT,                         -- ID of the person
    Relative_Id INT,                       -- ID of the relative
    Connection_Type VARCHAR(20),          -- Type of relationship (e.g., father, mother, son, etc.)
    PRIMARY KEY (Person_Id, Relative_Id)  -- Composite primary key to ensure uniqueness
);

-- Insert immediate family relationships into Family_Tree
INSERT INTO Family_Tree (Person_Id, Relative_Id, Connection_Type)

-- Father relationships
SELECT Person_Id, Father_Id, 'father'
FROM People 
WHERE Father_Id IS NOT NULL

UNION ALL

-- Mother relationships
SELECT Person_Id, Mother_Id, 'mother'
FROM People 
WHERE Mother_Id IS NOT NULL

UNION ALL

-- Sibling relationships (brother/sister)
SELECT p1.Person_Id, p2.Person_Id, 
       CASE WHEN p1.Gender = 'M' THEN 'brother' ELSE 'sister' END 
FROM People p1
JOIN People p2 
    ON (p1.Father_Id = p2.Father_Id OR p1.Mother_Id = p2.Mother_Id)
    AND p1.Person_Id <> p2.Person_Id
WHERE p1.Father_Id IS NOT NULL 
AND p1.Mother_Id IS NOT NULL

UNION ALL

-- Children (son/daughter) from father's perspective
SELECT Father_Id, Person_Id, 
       CASE WHEN Gender = 'M' THEN 'son' ELSE 'daughter' END 
FROM People 
WHERE Father_Id IS NOT NULL

UNION ALL

-- Children (son/daughter) from mother's perspective
SELECT Mother_Id, Person_Id, 
       CASE WHEN Gender = 'M' THEN 'son' ELSE 'daughter' END 
FROM People 
WHERE Mother_Id IS NOT NULL

UNION ALL

-- Spouse relationships (husband/wife)
SELECT Person_Id, Spouse_Id, 
       CASE WHEN Gender = 'M' THEN 'wife' ELSE 'husband' END 
FROM People 
WHERE Spouse_Id IS NOT NULL;


--Ex2.
-- Complete missing spouse links by updating people who don't have a Spouse_Id
-- but are already listed as a spouse by someone else
UPDATE People 
SET Spouse_Id = (
    SELECT p1.Person_Id
    FROM People p1
    WHERE p1.Spouse_Id = People.Person_Id
)
WHERE Spouse_Id IS NULL
AND EXISTS (
    SELECT 1
    FROM People p1
    WHERE p1.Spouse_Id = People.Person_Id
);
