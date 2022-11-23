-- Survey
DROP TABLE IF EXISTS surveys;

CREATE TABLE surveys (
  surveyId INTEGER PRIMARY KEY AUTOINCREMENT,
  dao TEXT NOT NULL,
  name TEXT NOT NULL,
  contributionsOpenAt DATETIME NOT NULL,
  contributionsCloseRatingsOpenAt DATETIME NOT NULL,
  ratingsCloseAt DATETIME NOT NULL,
  contributionInstructions TEXT NOT NULL,
  ratingInstructions TEXT NOT NULL,
  attributesJson TEXT NOT NULL,
  proposalId TEXT,
  createdAtBlockHeight INTEGER NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- Contribution
DROP TABLE IF EXISTS contributions;

CREATE TABLE contributions (
  contributionId INTEGER PRIMARY KEY AUTOINCREMENT,
  surveyId INTEGER NOT NULL,
  contributorPublicKey TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_surveys FOREIGN KEY (surveyId) REFERENCES surveys (surveyId),
  CONSTRAINT unique_survey_contributor UNIQUE (surveyId, contributorPublicKey)
);

-- Rating
DROP TABLE IF EXISTS ratings;

CREATE TABLE ratings (
  ratingId INTEGER PRIMARY KEY AUTOINCREMENT,
  surveyId INTEGER NOT NULL,
  contributionId INTEGER NOT NULL,
  attributeIndex INTEGER NOT NULL,
  raterPublicKey TEXT NOT NULL,
  rating INTEGER,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT fk_surveys FOREIGN KEY (surveyId) REFERENCES surveys (surveyId),
  CONSTRAINT fk_contributions FOREIGN KEY (contributionId) REFERENCES contributions (contributionId),
  CONSTRAINT unique_survey_contribution_rater_attribute UNIQUE (
    surveyId,
    contributionId,
    attributeIndex,
    raterPublicKey
  )
);