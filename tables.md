## `profiles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| email | TEXT | |
| cpf | TEXT | |
| full_name | TEXT | |
| role | TEXT | |
| driver_type | TEXT | |
| participates_in_ranking | BOOLEAN | |
| active | BOOLEAN | |
| modality_ids | UUID[] | |
| visible_tabs | TEXT[] | |
| score_profile_id | UUID | |
| created_at | TIMESTAMP | |


## `vehicle_modalities`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| created_at | TIMESTAMP | |


## `vehicles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| plate | TEXT | |
| model | TEXT | |
| type | TEXT | |
| modality_id | UUID | |
| requires_trailer | BOOLEAN | |
| active | BOOLEAN | |
| visible_tabs | TEXT[] | |
| manual_location | TEXT | |
| manual_status | TEXT | |
| last_status_update | TIMESTAMP | |
| created_at | TIMESTAMP | |


## `trailers`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| plate | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `routes`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| origin | TEXT | |
| destination | TEXT | |
| distance_km | NUMERIC | |
| stops | JSONB | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_types`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| title | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| type_id | UUID | |
| title | TEXT | |
| is_trailer_item | BOOLEAN | |
| order_index | INTEGER | |
| input_type | TEXT | |
| appears_in_manual | BOOLEAN | |
| is_fuel_liters | BOOLEAN | |
| created_at | TIMESTAMP | |


## `checklist_submissions`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| route_id | UUID | |
| type | TEXT | |
| odometer | INTEGER | |
| latitude | NUMERIC | |
| longitude | NUMERIC | |
| photos | JSONB | |
| receipt_photo_url | TEXT | |
| details | JSONB | |
| status | TEXT | |
| created_at | TIMESTAMP | |


## `driver_performance`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| driver_id | UUID | |
| score | INTEGER | |
| total_checklists | INTEGER | |
| updated_at | TIMESTAMP | |


## `checklist_issues`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| submission_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| driver_id | UUID | |
| item_title | TEXT | |
| description | TEXT | |
| photo_url | TEXT | |
| attachments | JSONB | |
| status | TEXT | |
| report_count | INTEGER | |
| resolution_notes | TEXT | |
| resolved_at | TIMESTAMP | |
| resolved_by | UUID | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |


## `app_settings`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | TEXT | |
| system_type | TEXT | |
| initial_value | NUMERIC | |
| penalty_value | NUMERIC | |
| penalty_start | NUMERIC | |
| penalty_end | NUMERIC | |
| penalty_fuel | NUMERIC | |
| penalty_yard | NUMERIC | |
| require_external_photos | BOOLEAN | |
| require_fuel_receipt_photo | BOOLEAN | |
| require_location | BOOLEAN | |
| closing_rule | TEXT | |
| closing_day | INTEGER | |
| updated_at | TIMESTAMP | |


## `vehicle_types`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| max_speed | NUMERIC | |
| ideal_consumption | NUMERIC | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `vehicle_models`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| type_id | UUID | |
| name | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `schedules`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| vehicle_id | UUID | |
| trailer_id | UUID | |
| route_id | UUID | |
| start_at | TIMESTAMP | |
| end_at | TIMESTAMP | |
| start_checklist_id | UUID | |
| end_checklist_id | UUID | |
| fuel_checklist_id | UUID | |
| requires_fueling | BOOLEAN | |
| bait1_id | UUID | |
| bait2_id | UUID | |
| bait3_id | UUID | |
| penalty_applied | BOOLEAN | |
| created_at | TIMESTAMP | |


## `baits`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `audit_logs`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| driver_id | UUID | |
| type | TEXT | |
| amount | NUMERIC | |
| reason | TEXT | |
| created_at | TIMESTAMP | |


## `score_profiles`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| calculation_type | TEXT | |
| base_value | NUMERIC | |
| penalty_start | NUMERIC | |
| penalty_end | NUMERIC | |
| penalty_fuel | NUMERIC | |
| penalty_yard | NUMERIC | |
| apply_penalty_start | BOOLEAN | |
| apply_penalty_end | BOOLEAN | |
| apply_penalty_fuel | BOOLEAN | |
| apply_penalty_yard | BOOLEAN | |
| closing_rule | TEXT | |
| closing_value | TEXT | |
| created_at | TIMESTAMP | |


## `manual_penalties`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| points | NUMERIC | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `score_closings`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| period_start | DATE | |
| period_end | DATE | |
| closed_at | TIMESTAMP | |
| closed_by | UUID | |


## `score_closing_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| closing_id | UUID | |
| driver_id | UUID | |
| score | INTEGER | |
| total_checklists | INTEGER | |


## `companies`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| document | TEXT | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `saas_plans`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| description | TEXT | |
| max_users | INTEGER | |
| max_vehicles | INTEGER | |
| price | DECIMAL(10 | |
| active | BOOLEAN | |
| created_at | TIMESTAMP | |


## `vehicle_averages`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| company_id | UUID | |
| vehicle_id | UUID | |
| driver_id | UUID | |
| schedule_id | UUID | |
| fuel_submission_id | UUID | |
| start_date | TIMESTAMP | |
| end_date | TIMESTAMP | |
| start_odometer | INTEGER | |
| end_odometer | INTEGER | |
| distance | INTEGER | |
| liters | NUMERIC | |
| average | NUMERIC | |
| status | TEXT | |
| notes | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |


## `inventory_suppliers`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| name | TEXT | |
| cnpj_cpf | TEXT | |
| contact_name | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| created_at | TIMESTAMPTZ | |
| company_id | UUID | |


## `inventory_items`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| sku | TEXT | |
| name | TEXT | |
| category | TEXT | |
| brand | TEXT | |
| min_quantity | NUMERIC | |
| current_quantity | NUMERIC | |
| average_cost | NUMERIC | |
| created_at | TIMESTAMPTZ | |
| company_id | UUID | |


## `inventory_transactions`

### Campos

| Campo | Tipo | Descrição |
| ----- | ---- | --------- |
| id | UUID | |
| item_id | UUID | |
| supplier_id | UUID | |
| type | TEXT | |
| quantity | NUMERIC | |
| unit_price | NUMERIC | |
| total_price | NUMERIC | |
| nf_number | TEXT | |
| nf_key | TEXT | |
| date | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| created_by | UUID | |
| company_id | UUID | |


