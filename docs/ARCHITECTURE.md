# System Architecture

## Database Schema (Mermaid ERD)
```mermaid
erDiagram
    User ||--o{ Course : "manages"
    Course ||--o{ Learning_Result : "contains"
    Learning_Result ||--o{ Competency_Criterion : "breaks down"
    Course ||--o{ Didactic_Unit : "planned by"
    Didactic_Unit }|..|{ Competency_Criterion : "covers"
    Course ||--o{ Evaluation_Instrument : "measures"
    Evaluation_Instrument ||--o{ Instrument_Criterion_Weight : "defines weight"
    Competency_Criterion ||--o{ Instrument_Criterion_Weight : "weighted in"
    Evaluation_Instrument ||--o{ Grade : "records"
    Grade }|--|| Competency_Criterion : "assigned to"

    User {
        uuid id PK
        string email
        string role "admin | teacher"
    }

    Course {
        uuid id PK
        string title
        string region
        string academic_year
        boolean is_public
        uuid creator_id FK
    }

    Learning_Result {
        uuid id PK
        string code "RA1"
        string description
        float weight_in_course "0-100"
    }

    Competency_Criterion {
        uuid id PK
        uuid ra_id FK
        string code "CE 1.a"
        string description
    }

    Instrument_Criterion_Weight {
        uuid id PK
        uuid instrument_id FK
        uuid criterion_id FK
        float weight "Percentage of the criterion covered"
    }