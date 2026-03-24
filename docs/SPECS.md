# Business Logic Specifications (LOMLOE - Program Planner)

## 1. Curriculum Hierarchy & Weights
The system follows a strict hierarchical structure to ensure legal compliance with the LOMLOE framework.

- **Course (Módulo):** The top-level entity (e.g., "Desarrollo Web en Entorno Servidor").
- **Learning Results (RA):** - A Course must have one or more RAs.
    - **Weighting:** Each RA has a percentage weight relative to the Course. The sum of all RA weights in a Course MUST be exactly **100%**.
- **Competency Criteria (CE):** - Each RA is broken down into several CEs.
    - **Weighting:** Each CE has a weight relative to its parent RA. The sum of all CE weights within an RA MUST be exactly **100%**.

## 2. Planning Logic (Didactic Units - UT)
- A **Didactic Unit (UT)** is a temporal grouping of content.
- **Mapping:** A UT must be linked to one or more CEs. 
- **Many-to-Many:** A single CE can be covered by multiple UTs throughout the year.
- **Trimesters:** Each UT is assigned to a trimester (1st, 2nd, or 3rd). This automatically determines which RAs/CEs are being evaluated in each period.

## 3. Evaluation Engine (Instruments & Grades)
This is the core calculation logic of the application.

- **Instruments:** Types include Exams, Projects, Homework, Observation, etc.
- **Weighting per CE:** An instrument does not have a "global weight". Instead, it defines what percentage of a specific **CE** it covers.
    - *Example:* "Exam 1" might cover 50% of CE 1.a and 50% of CE 1.b.
- **Grading Granularity:**
    - **Advanced Mode:** The teacher inputs a specific grade for each CE linked to the instrument.
    - **Simple Mode:** The teacher inputs one grade (e.g., 8.0) and the system replicates it across all CEs linked to that instrument.
- **Final Grade Calculation:**
    - $Grade_{CE} = \sum (Grade_{Instrument} \times Weight_{InInstrument})$
    - $Grade_{RA} = \sum (Grade_{CE} \times Weight_{InRA})$
    - $FinalGrade = \sum (Grade_{RA} \times Weight_{InCourse})$

## 4. Social & Collaborative Features (Forks)
- **Visibility:** Courses can be `private` or `public`.
- **The Fork Mechanism:** - When a teacher "imports" a public course, the system creates a **deep copy** (Clone).
    - The cloned version belongs to the new teacher. They can modify RAs, CEs, or UTs without affecting the original source.
    - If a teacher improves a cloned course, they can publish it as a new version (e.g., "V2" or "Updated").

## 5. Technical Constraints for Agents
- **Validation:** Use **Zod** for all data validation, especially for percentage sums.
- **Consistency:** If a teacher changes the weight of an RA, the system must trigger a recalculation of the total course weight and alert if it doesn't sum 100%.
- **Database Integrity:** Use PostgreSQL Foreign Keys and Cascades to prevent orphaned CEs or RAs.