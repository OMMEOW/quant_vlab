# QA Virtual Lab — End-to-End Project Plan

## 1. Overview
Develop a **Virtual Quantitative Analysis Lab** using **Next.js (React) + Tailwind CSS**.  
The application enables users to upload a `.csv` dataset and perform **9 Quantitative Analysis experiments** sequentially on the same dataset.

The system must support:
- Fully interactive **manual mode** (step-by-step learning)
- **Auto mode** (one-click execution)
- Clear **data transformation flow**
- Strong **visualization and explanation support**
- **Screenshot capture** of outputs

---

## 2. Goals
- Simulate a **real lab environment**
- Provide **guided statistical learning**
- Ensure **clean UI and smooth transitions**
- Maintain **single dataset consistency across modules**
- Deliver **accurate statistical outputs**

---

## 3. Tech Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui (UI components)
- Framer Motion (animations)
- Chart.js / Recharts (graphs)

### State Management
- Zustand (preferred)

### Backend (Recommended)
- FastAPI (Python)
- Libraries:
  - pandas
  - numpy
  - scipy
  - statsmodels

(Alternative: Fully JS using simple-statistics)

---

## 4. Core System Flow
CSV Upload
↓
Data Cleaning & Preprocessing
↓
Global Dataset State
↓
Modules (EXP 1 → EXP 9)
↓
Results + Visualizations
↓
Export / Screenshot



---

## 5. Key Features

### CSV Upload
- Accept `.csv` file
- Validate format and size
- Parse into structured dataset
- Display preview table

---

### Data Handling
- Handle missing values
- Detect data types automatically
- Maintain a **global dataset state**

---

### Modes

#### Manual Mode
- Step-by-step execution
- User selects:
  - Variables
  - Methods
- Provide:
  - Hints
  - Explanations
  - Error handling

#### Auto Mode
- One-click execution
- Runs entire module automatically
- Displays final outputs directly

---

## 6. Modules (Experiments)

### EXP 1: Data Types & Basic Analysis
- Detect numerical and categorical data
- Show:
  - Mean, median, mode
  - Missing values
- Output: summary table

---

### EXP 2: Data Visualization
- Histogram
- Box plot
- Bar chart
- Dynamic column selection

---

### EXP 3: Sampling Techniques
- Random sampling
- Stratified sampling
- Adjustable sample size
- Output sampled dataset

---

### EXP 4: Correlation & Simple Linear Regression
- Pearson correlation
- Linear regression (y = mx + b)
- Scatter plot with regression line

---

### EXP 5: Partial & Multiple Correlation
- Correlation matrix
- Heatmap visualization

---

### EXP 6: Multiple Linear Regression
- Multi-variable regression
- Outputs:
  - Equation
  - R² score
  - Predictions

---

### EXP 7: Maximum Likelihood Estimation
- Distributions:
  - Normal
  - Poisson
  - Exponential
- Output estimated parameters

---

### EXP 8: T-Test
- One-sample t-test
- Two-sample t-test
- Output:
  - t-value
  - p-value
  - Decision

---

### EXP 9: Z-Test
- One-sample z-test
- Two-sample z-test
- Output:
  - z-score
  - Decision

---

## 7. UI/UX Design

### Layout
- Left panel: Module navigation
- Center: Interactive workspace
- Right panel: Hints / Theory

---

### UI Features
- Clean minimal aesthetic
- Smooth transitions (Framer Motion)
- Tooltips and popups for explanations
- Step indicators for workflow

---

## 8. Interactivity

### Guided Flow
- User performs steps manually
- System validates input
- Provides hints and explanations

### Automated Flow
- System executes full module
- Displays results instantly

---

## 9. Visualization

- Use Chart.js / Recharts
- Graphs:
  - Histogram
  - Scatter plot
  - Box plot
  - Heatmap

---

## 10. Screenshot Feature

### Requirement
- Button to capture current page

### Implementation
- Use `html2canvas`
- Save image locally

---

## 11. Folder Structure
/app
/upload
/modules
/exp1
/exp2
/exp3
/exp4
/exp5
/exp6
/exp7
/exp8
/exp9
/components
/lib
/store
/api (optional backend)



---

## 12. State Design

Global State should include:
- dataset
- cleanedData
- selectedColumns
- moduleResults
- mode (manual / auto)

---

## 13. Output System

Each module must return:
- Computed results
- Graphs
- Explanation text

Final output page:
- Combined summary of all modules

---

## 14. Error Handling

- Invalid CSV
- Missing values
- Incorrect user selections
- Statistical edge cases

---

## 15. Enhancements (Optional)

- Dark/Light mode
- Save user session
- Export results as PDF
- Quiz after each module
- AI hint assistant

---

## 16. Development Phases

### Phase 1
- Project setup
- CSV upload + parsing

### Phase 2
- EXP 1–3 implementation

### Phase 3
- EXP 4–6 implementation

### Phase 4
- EXP 7–9 implementation

### Phase 5
- UI polish and animations

### Phase 6
- Screenshot + export features

---

## 17. Deployment

- Frontend: Vercel
- Backend (if used): Render / Railway

---

## 18. Success Criteria

- All 9 modules working correctly
- Smooth user experience
- Accurate statistical outputs
- Fully interactive virtual lab feel
- Clean and presentable UI

---