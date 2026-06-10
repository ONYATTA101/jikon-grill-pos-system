# Jikon Grill POS Project Flowcharts

Last updated: 10 June 2026

This document maps the architecture, role routing, restaurant workflows, inventory effects, approvals, daily closing, and production operations of the Jikon Grill POS.

The diagrams use Mermaid syntax and render in compatible Markdown viewers such as GitHub and Visual Studio Code with Mermaid support.

## 1. Complete System Flow

```mermaid
flowchart TD
    Start([Open Jikon Grill POS]) --> Login[Staff Login]
    Login --> Auth{Credentials valid?}
    Auth -- No --> Failure[Show error and record failed attempt]
    Failure --> RateLimit{Too many failures?}
    RateLimit -- Yes --> Wait[Temporarily block login]
    RateLimit -- No --> Login
    Wait --> Login
    Auth -- Yes --> Role{Staff role}

    Role -->|Owner| Owner[Owner Dashboard]
    Role -->|Manager| Manager[Manager Dashboard]
    Role -->|Cashier| POS[POS Terminal]
    Role -->|Waiter| Tables[Tables]
    Role -->|Kitchen| Kitchen[Kitchen Station]
    Role -->|Bartender| Bar[Bar Station]
    Role -->|Admin| Staff[Staff Management]

    Owner --> Reports[Reports and Audit]
    Owner --> Operations[Operational Management]
    Manager --> Operations
    POS --> OrderFlow[Order and Payment Flow]
    Tables --> OrderFlow
    Kitchen --> StationFlow[Preparation Flow]
    Bar --> StationFlow
    Staff --> Operations
```

## 2. Application Architecture

```mermaid
flowchart LR
    Device[Browser or POS Device] --> Next[Next.js Application]
    Next --> Proxy[Authentication and Role Proxy]
    Proxy --> Pages[Protected Pages]
    Proxy --> API[API Routes and Server Actions]
    Pages --> API
    API --> Prisma[Prisma Client]
    Prisma --> PostgreSQL[(PostgreSQL Database)]

    Next --> Logs[Output and Error Logs]
    Scripts[PowerShell Operations Scripts] --> Next
    Scripts --> PostgreSQL
    PostgreSQL --> Backups[(Backup Archives)]
```

## 3. Role And Workspace Routing

```mermaid
flowchart TD
    Session{Authenticated session} -->|No| Login[Login Page]
    Session -->|Yes| Role{Role}

    Role -->|OWNER| OD[Owner Dashboard]
    Role -->|MANAGER| MD[Manager Dashboard]
    Role -->|CASHIER| PT[POS Terminal]
    Role -->|WAITER| TP[Tables Page]
    Role -->|KITCHEN| KS[Kitchen Station]
    Role -->|BARTENDER| BS[Bar Station]
    Role -->|ADMIN| SM[Staff Management]

    Protected{Requested page allowed?} -->|Yes| Page[Open Requested Page]
    Protected -->|No| Role
```

## 4. Restaurant Order Flow

```mermaid
flowchart TD
    New([Start New Order]) --> Type{Service type}
    Type -->|Table| SelectTable[Select Table]
    Type -->|Takeaway| Takeaway[Create Takeaway Order]
    Type -->|Delivery| Delivery[Create Delivery Order]

    SelectTable --> AddItems[Add Products and Notes]
    Takeaway --> AddItems
    Delivery --> AddItems

    AddItems --> Route{Product station}
    Route -->|Kitchen| KitchenTicket[Create Kitchen Ticket]
    Route -->|Bar| BarTicket[Create Bar Ticket]
    Route -->|None| DirectItem[Keep Direct Item On Bill]

    KitchenTicket --> KitchenReady[Kitchen Marks Ready]
    BarTicket --> BarReady[Bar Marks Ready]
    DirectItem --> ReadyCheck
    KitchenReady --> ReadyCheck{All station items ready?}
    BarReady --> ReadyCheck

    ReadyCheck -- No --> Preparation[Continue Preparation]
    Preparation --> ReadyCheck
    ReadyCheck -- Yes --> Ready[Order Ready]
    Ready --> Served[Waiter Marks Served]
    Served --> Payment[Proceed To Payment]
```

## 5. Payment And Receipt Flow

```mermaid
flowchart TD
    Bill[Open Bill] --> Review[Review Items and Totals]
    Review --> Discount{Discount requested?}
    Discount -- Yes --> Approval{Owner or Manager?}
    Approval -- No --> RejectDiscount[Reject Discount]
    Approval -- Yes --> ApplyDiscount[Apply Discount and Record Reason]
    RejectDiscount --> Review
    ApplyDiscount --> Total
    Discount -- No --> Total[Calculate Subtotal, Tax, Service Charge, and Total]

    Total --> Method{Payment method}
    Method --> Cash[Cash]
    Method --> Mpesa[M-Pesa and Reference]
    Method --> Card[Card and Reference]
    Method --> Bank[Bank and Reference]
    Method --> Split[Split Payment]

    Cash --> Save[Record Payment]
    Mpesa --> Save
    Card --> Save
    Bank --> Save
    Split --> Save
    Save --> Paid[Mark Sale and Order Paid]
    Paid --> Stock[Deduct Tracked Inventory]
    Stock --> Receipt[Open or Print Receipt]
    Receipt --> Lock[Lock Paid Bill Against Duplicate Payment]
```

## 6. Refund And Void Flow

```mermaid
flowchart TD
    Sale[Completed Sale] --> Choice{Requested action}

    Choice -->|Refund| Request[Submit Refund Amount and Reason]
    Request --> RefundReview{Owner or Manager review}
    RefundReview -->|Reject| RefundRejected[Record Rejection]
    RefundReview -->|Approve| RefundApproved[Record Approval and Refund]

    Choice -->|Void| VoidPermission{Owner or Manager?}
    VoidPermission -->|No| VoidRejected[Reject Void]
    VoidPermission -->|Yes| VoidSale[Mark Sale Voided]
    VoidSale --> ReverseStock[Reverse Related Stock Deductions]

    RefundRejected --> Audit[Write Audit Log]
    RefundApproved --> Audit
    VoidRejected --> Audit
    ReverseStock --> Audit
```

## 7. Inventory Flow

```mermaid
flowchart TD
    Product[Product Sold] --> Tracking{Stock tracking type}
    Tracking -->|None| NoChange[No Inventory Change]
    Tracking -->|Direct| Direct[Reduce Direct Inventory Item]
    Tracking -->|Recipe| Recipe[Read Product Recipe]
    Recipe --> Ingredients[Reduce Each Ingredient]

    Direct --> Movement[Create Sale Deduction Movement]
    Ingredients --> Movement
    Movement --> Level{Below Minimum Stock?}
    Level -->|Yes| Alert[Show Low Stock Alert]
    Level -->|No| Current[Keep Current Status]

    Adjustment[Purchase, Wastage, Return, Transfer, or Correction] --> Reason[Require Reason]
    Reason --> AdjustStock[Update Stock]
    AdjustStock --> AdjustmentMovement[Create Stock Movement]
```

## 8. Daily Closing Flow

```mermaid
flowchart TD
    End([End Of Business Day]) --> Resolve[Resolve Open Orders and Pending Actions]
    Resolve --> ReviewSales[Review Paid Sales and Payment Breakdown]
    ReviewSales --> CountCash[Count Actual Cash]
    CountCash --> Compare[Compare Expected and Actual Cash]
    Compare --> Variance{Cash variance?}
    Variance -->|Yes| Explain[Enter Variance Notes]
    Variance -->|No| SaveClosing[Save Daily Closing]
    Explain --> SaveClosing
    SaveClosing --> Export[Export Sales and Profit Reports]
    Export --> Backup[Create Database Backup]
    Backup --> Stop[Stop POS When Required]
```

## 9. Production Start And Health Flow

```mermaid
flowchart TD
    Command[npm run pos:start:prod] --> StopPort[Stop Existing Port Process]
    StopPort --> Clear[Clear Next.js Cache]
    Clear --> Build[Build Production Application]
    Build --> BuildOK{Build passed?}
    BuildOK -- No --> Error[Stop and Show Error]
    BuildOK -- Yes --> Start[Start Tracked Node Process]
    Start --> Logs[Write Output and Error Logs]
    Logs --> Health{Health endpoint and database connected?}
    Health -- No --> Error
    Health -- Yes --> Browser[Open Login Page]
    Browser --> Running([POS Running])
```

## 10. Backup And Recovery Flow

```mermaid
flowchart TD
    BackupStart[Run npm run db:backup] --> ReadEnv[Read Database URL]
    ReadEnv --> Dump[Run pg_dump]
    Dump --> Archive[(Timestamped Backup Archive)]
    Archive --> Validate[Validate and Store Securely]

    Incident[Recovery Required] --> Stop[Stop POS]
    Stop --> Select[Select Valid Backup]
    Select --> Confirm{RESTORE confirmation supplied?}
    Confirm -- No --> Abort[Abort Restore]
    Confirm -- Yes --> Restore[Run pg_restore]
    Restore --> Start[Start Production POS]
    Start --> Verify[Verify Health, Login, Inventory, and Service Flow]
```

## 11. Initial Launch Preparation Flow

```mermaid
flowchart TD
    Setup[Install Dependencies and Configure PostgreSQL] --> Migrate[Apply Database Migrations]
    Migrate --> Seed[Seed Starter Configuration]
    Seed --> Passwords[Generate Secure Launch Passwords]
    Passwords --> Configure[Enter Restaurant Settings and Confirm Stock]
    Configure --> SafetyBackup[Create Safety Backup]
    SafetyBackup --> Confirm{CLEAN confirmation supplied?}
    Confirm -- No --> Abort[Abort Cleanup]
    Confirm -- Yes --> Clean[Remove Test Operational Data]
    Clean --> VerifyData[Verify Clean Launch State]
    VerifyData --> Release[Run Release Check]
    Release --> FinalBackup[Create and Validate Final Backup]
    FinalBackup --> Production[Start Production POS]
    Production --> ServiceTest[Complete Launch Service Test]
```

## 12. Core Data Relationship Flow

```mermaid
erDiagram
    ROLE ||--o{ USER : assigns
    USER ||--o{ ORDER : serves
    USER ||--o{ SALE : processes
    USER ||--o{ AUDIT_LOG : creates
    CATEGORY ||--o{ PRODUCT : contains
    PRODUCT ||--o{ RECIPE : defines
    INVENTORY_ITEM ||--o{ RECIPE : supplies
    RESTAURANT_TABLE ||--o{ ORDER : hosts
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : selected
    ORDER ||--o| SALE : becomes
    SALE ||--|{ SALE_ITEM : contains
    PRODUCT ||--o{ SALE_ITEM : records
    SALE ||--o{ PAYMENT : receives
    SALE ||--o{ REFUND : may_have
    SALE ||--o{ DISCOUNT : may_have
    SALE ||--o{ STOCK_MOVEMENT : causes
    INVENTORY_ITEM ||--o{ STOCK_MOVEMENT : tracks
    SUPPLIER ||--o{ STOCK_MOVEMENT : supplies
    USER ||--o{ DAILY_CLOSING_REPORT : closes
```

## 13. Project Route Map

```mermaid
flowchart LR
    App[Application] --> Public[Public]
    App --> Operations[Operations]
    App --> Stations[Stations]
    App --> Management[Management]
    App --> Owner[Owner]
    App --> API[API]

    Public --> Login["/login"]
    Operations --> POS["/pos"]
    Operations --> Tables["/tables"]
    Operations --> Orders["/orders"]
    Operations --> Receipts["/receipt"]
    Stations --> Kitchen["/kitchen"]
    Stations --> Bar["/bar"]
    Management --> Products["/products"]
    Management --> Inventory["/inventory"]
    Management --> Stock["/stock-adjustments"]
    Management --> Suppliers["/suppliers"]
    Management --> Expenses["/expenses"]
    Management --> Staff["/staff"]
    Management --> Settings["/settings"]
    Management --> Closing["/closing"]
    Owner --> OwnerDashboard["/owner/dashboard"]
    Owner --> OwnerReports["/owner/reports"]
    Owner --> OwnerSales["/owner/sales"]
    Owner --> OwnerProfit["/owner/profit"]
    Owner --> OwnerRefunds["/owner/refunds"]
    Owner --> OwnerAudit["/owner/audit-logs"]
    API --> AuthAPI[Authentication]
    API --> OrdersAPI[Orders]
    API --> SalesAPI[Sales, Refunds, and Voids]
    API --> ProductsAPI[Products]
    API --> ExportAPI[Owner Exports]
    API --> HealthAPI[Health]
```

## 14. Related Documents

- [FULL SYSTEM FUNCTION AND DATA FLOWCHART.md](FULL%20SYSTEM%20FUNCTION%20AND%20DATA%20FLOWCHART.md): Complete outside-to-inside map of named functions, processes, data transfers, deployment, and operations
- [DOCUMENTATION.md](DOCUMENTATION.md): Complete operating, administration, setup, and delivery procedures
- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md): Before-opening and service-test checklist
- [README.md](README.md): Quick start and command overview
