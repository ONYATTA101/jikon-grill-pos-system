# Jikon Grill POS Full System Function And Data Flowchart

Last updated: 10 June 2026

This document is the complete graphical map of how people, browser screens, named source-code functions, API routes, shared services, PostgreSQL records, deployment services, and maintenance tools interact.

Every named application function is represented below. Small anonymous callbacks used inside rendering and array operations are represented by their named parent component or business function because they do not form separate system entry points.

The diagrams use Mermaid syntax and render graphically on GitHub and in compatible Markdown viewers.

## Legend

```mermaid
flowchart LR
    Outside["Outside actor or service"] --> Screen["Browser page or component"]
    Screen --> Endpoint["API route or server action"]
    Endpoint --> Service["Shared business function"]
    Service --> Data[("PostgreSQL data")]
    Data --> Output["Screen, receipt, export, log, or backup"]
```

## 1. Complete Outside And Inside System Interaction

```mermaid
flowchart LR
    subgraph Outside["Outside The POS"]
        Customer["Customer"]
        Owner["Owner"]
        Manager["Manager"]
        Cashier["Cashier"]
        Waiter["Waiter"]
        KitchenStaff["Kitchen Staff"]
        BarStaff["Bar Staff"]
        Admin["Administrator"]
        PaymentProvider["External payment provider<br/>M-Pesa, card, or bank"]
        Interviewer["Interviewer / reviewer"]
        Operator["System operator"]
    end

    subgraph Browser["Browser And User Interface"]
        Login["LoginForm / LoginPage"]
        Shell["AppShell / AppShellClient / ThemeToggle"]
        POS["PosPage / PosTerminal"]
        Orders["TablesPage / OrdersPage / OrderTicket"]
        Stations["KitchenPage / BarPage"]
        Management["Products / Inventory / Suppliers / Expenses / Staff / Settings / Closing"]
        OwnerViews["Owner dashboard / sales / profit / refunds / audit / reports"]
        Receipt["ReceiptPage"]
    end

    subgraph Server["Next.js Server"]
        Guard["proxy / session / role permission checks"]
        AuthAPI["Authentication API"]
        OrderAPI["Order API"]
        SalesAPI["Sales, refund, and void APIs"]
        ProductAPI["Product API"]
        Actions["Server actions"]
        Reports["Report and CSV functions"]
    end

    subgraph Data["Trusted Data Layer"]
        Prisma["Prisma Client"]
        PostgreSQL[("Neon or local PostgreSQL")]
    end

    subgraph Operations["Hosting And Operations"]
        Vercel["Vercel live application"]
        GitHub["GitHub source repository"]
        Scripts["Start, stop, release, seed, launch, backup, and restore scripts"]
        Backups[("Private backup archives")]
    end

    Customer --> Waiter
    Customer --> Cashier
    Owner --> OwnerViews
    Manager --> Management
    Cashier --> POS
    Waiter --> Orders
    KitchenStaff --> Stations
    BarStaff --> Stations
    Admin --> Management
    Interviewer --> Vercel
    Interviewer --> GitHub
    Operator --> Scripts
    PaymentProvider --> POS

    Login --> AuthAPI
    Shell --> Guard
    POS --> SalesAPI
    Orders --> OrderAPI
    Stations --> OrderAPI
    Management --> Actions
    Management --> ProductAPI
    OwnerViews --> Reports
    SalesAPI --> Receipt

    Guard --> Prisma
    AuthAPI --> Prisma
    OrderAPI --> Prisma
    SalesAPI --> Prisma
    ProductAPI --> Prisma
    Actions --> Prisma
    Reports --> Prisma
    Prisma --> PostgreSQL

    GitHub --> Vercel
    Vercel --> Server
    Scripts --> Server
    Scripts --> PostgreSQL
    PostgreSQL --> Backups
    Backups --> PostgreSQL
```

## 2. Every Request And Data Transfer

```mermaid
sequenceDiagram
    actor Staff
    participant UI as Page / Component
    participant Proxy as proxy + session functions
    participant API as API Route / Server Action
    participant Service as Shared Business Functions
    participant Prisma
    participant DB as PostgreSQL
    participant Output as Screen / Receipt / CSV / Log

    Staff->>UI: Opens page or submits action
    UI->>Proxy: Sends signed session cookie
    Proxy->>Proxy: verifySessionToken + findRule + hasPermission
    alt Not authenticated or not authorized
        Proxy-->>UI: Redirect to login or role start page
    else Authorized
        Proxy->>API: Allow request
        API->>Service: Validate and process business command
        Service->>Prisma: Typed read or transaction
        Prisma->>DB: SQL query or update
        DB-->>Prisma: Trusted records
        Prisma-->>Service: Typed result
        Service-->>API: Business result
        API-->>Output: JSON, rendered page, receipt, CSV, or audit result
        Output-->>Staff: Updated information and feedback
    end
```

## 3. Page And Reusable Interface Functions

```mermaid
flowchart TD
    Root["RootLayout<br/>HomePage<br/>LoginPage"] --> Shell["AppShell<br/>AppShellClient<br/>ThemeToggle<br/>getStoredTheme<br/>applyTheme<br/>toggleTheme"]
    Shell --> Shared["PageHeader<br/>Panel<br/>MetricCard<br/>StatusPill<br/>FeedbackBanner<br/>BarList<br/>PaymentMix"]

    Login["LoginForm<br/>submitLogin"] --> Auth["POST /api/auth/login"]

    POSPage["PosPage"] --> Terminal["PosTerminal<br/>stationTone<br/>addProduct<br/>updateQuantity<br/>removeProduct<br/>resetBill<br/>payBill<br/>sendOrder"]
    Terminal --> OrderAPI["POST /api/orders"]
    Terminal --> SalesAPI["GET + POST /api/sales"]

    OrderPages["TablesPage<br/>tableStatus<br/>OrdersPage<br/>KitchenPage<br/>BarPage"] --> Ticket["OrderTicket<br/>updateStatus"]
    Ticket --> OrderUpdate["PATCH /api/orders/[orderId]"]

    ManagementPages["ProductsPage<br/>InventoryPage<br/>StockAdjustmentsPage<br/>SuppliersPage<br/>ExpensesPage<br/>StaffPage<br/>SettingsPage<br/>ClosingPage"]
    ManagementPages --> Actions["saveMovement<br/>normalizeMovementQuantity<br/>saveSupplier<br/>saveExpense<br/>createStaff<br/>updateStaff<br/>saveSettings<br/>saveClosing<br/>feedbackPath helpers"]

    OwnerPages["OwnerDashboardPage<br/>OwnerSalesPage<br/>OwnerProfitPage<br/>OwnerInventoryPage<br/>OwnerRefundsPage<br/>isToday<br/>OwnerAuditLogsPage<br/>OwnerReportsPage"]
    OwnerPages --> RefundUI["RequestRefundButton / requestRefund<br/>RefundActionButtons / updateRefund<br/>VoidSaleButton / voidSale"]
    OwnerPages --> Exports["Owner sales export GET<br/>Owner profit export GET<br/>formatDate helpers"]

    SalesAPI --> Receipt["ReceiptPage"]
```

## 4. Authentication, Session, Role, And Security Functions

```mermaid
flowchart TD
    Credentials["Username or email + password"] --> LoginPost["POST /api/auth/login"]
    LoginPost --> Limit["checkLoginAllowed"]
    Limit --> UserRead[("User + Role")]
    UserRead --> Verify["verifyPassword"]
    Verify -->|Invalid| Failure["recordLoginFailure"]
    Failure --> Limit
    Verify -->|Valid| Clear["clearLoginFailures"]
    Clear --> Token["createSessionToken<br/>getSessionSecret<br/>base64UrlEncode<br/>sign"]
    Token --> Cookie["Secure login cookie"]

    Cookie --> Proxy["proxy"]
    Proxy --> VerifyEdge["verifySessionToken<br/>base64UrlToBytes<br/>bytesToBase64Url<br/>sign"]
    VerifyEdge --> Rule["findRule"]
    Rule --> Permission["hasPermission"]
    Permission --> Current["getCurrentSession<br/>getAuthorizedSession"]
    Current --> RoleStart["getRoleStart"]
    RoleStart --> AllowedScreen["Allowed role workspace"]

    Logout["GET or POST /api/auth/logout"] --> DeleteCookie["Delete login cookie"]
```

## 5. Order Creation And Preparation Functions

```mermaid
flowchart TD
    Add["PosTerminal.addProduct / updateQuantity / removeProduct"] --> Send["PosTerminal.sendOrder"]
    Send --> OrderPost["POST /api/orders"]
    OrderPost --> Session["getAuthorizedSession"]
    OrderPost --> Type["toOrderType<br/>parseTableNumber"]
    Type --> Number["getNextDocumentNumber<br/>startOfBusinessDate<br/>formatBusinessDate"]
    Number --> Write[("Order + OrderItem + RestaurantTable + AuditLog")]

    Write --> Report["getOrderTickets"]
    Report --> Helpers["stationToLabel<br/>getTicketStatus<br/>formatAge"]
    Helpers --> Kitchen["KitchenPage + OrderTicket"]
    Helpers --> Bar["BarPage + OrderTicket"]
    Helpers --> Waiter["OrdersPage / TablesPage"]

    Kitchen --> Update["OrderTicket.updateStatus"]
    Bar --> Update
    Waiter --> Update
    Update --> Patch["PATCH /api/orders/[orderId]"]
    Patch --> Convert["toOrderStatus<br/>toStation"]
    Patch -. invalid .-> TicketError["TicketUpdateError constructor"]
    Convert --> Write
```

## 6. Payment, Sale, Receipt, And Stock Transaction Functions

```mermaid
flowchart TD
    Bill["PosTerminal.payBill"] --> SalePost["POST /api/sales"]
    SalePost --> Parse["parseSaleRequest<br/>toPaymentMethod<br/>toOrderType<br/>parseTableNumber"]
    Parse --> Cashier["getActiveCashier"]
    Cashier --> Items["getPayableSaleItems"]
    Items --> Existing["getExistingOrderSaleItems"]
    Items --> Direct["getDirectSaleItems"]
    Existing --> Valid["toValidSaleItem"]
    Direct --> Valid
    Valid --> Totals["getSaleTotals"]

    Totals --> Transaction["createPaidSale<br/>one PostgreSQL transaction"]
    Transaction --> Table["getOrCreatePaidTable"]
    Transaction --> Order["getOrCreatePaidOrder"]
    Transaction --> Sale["createSaleRecord"]
    Sale --> Numbers["getNextDocumentNumber"]
    Sale --> Records[("Sale + SaleItem + Payment + paid Order")]

    Transaction --> Deduct["deductStockForSale"]
    Deduct --> Deductions["getStockDeductions<br/>addDeduction"]
    Deductions --> Stock[("InventoryItem + StockMovement")]

    Transaction --> Audit["createSaleAuditLog"]
    Audit --> AuditData[("AuditLog")]
    Transaction --> Response["toSaleResponse"]
    Transaction -. error .-> Error["toErrorResponse"]
    Error --> SaleError["SaleError constructor"]
    Response --> Receipt["ReceiptPage"]
```

## 7. Refund, Void, Inventory, Supplier, And Expense Functions

```mermaid
flowchart LR
    Sale[("Completed Sale")] --> RequestUI["RequestRefundButton<br/>requestRefund"]
    RequestUI --> RequestAPI["POST /api/sales/[saleId]/refunds"]
    RequestAPI -. invalid .-> RefundError["RefundError constructor"]
    RequestAPI --> Refund[("Pending Refund")]
    Refund --> ReviewUI["RefundActionButtons<br/>updateRefund"]
    ReviewUI --> ReviewAPI["PATCH /api/refunds/[refundId]<br/>toApprovalStatus"]
    ReviewAPI -. invalid .-> ApprovalError["RefundApprovalError constructor"]
    ReviewAPI --> RefundResult[("Approved or rejected Refund + AuditLog")]

    Sale --> VoidUI["VoidSaleButton<br/>voidSale"]
    VoidUI --> VoidAPI["POST /api/sales/[saleId]/void"]
    VoidAPI -. invalid .-> VoidError["VoidSaleError constructor"]
    VoidAPI --> Reverse[("Voided Sale + reverse StockMovement + AuditLog")]

    StockForm["StockAdjustmentsPage<br/>saveMovement<br/>normalizeMovementQuantity"] --> Inventory[("InventoryItem + StockMovement")]
    SupplierForm["SuppliersPage<br/>saveSupplier"] --> Supplier[("Supplier")]
    ExpenseForm["ExpensesPage<br/>saveExpense"] --> Expense[("Expense + AuditLog")]

    Inventory --> InventoryReport["getInventoryReport"]
    InventoryReport --> InventoryViews["InventoryPage + OwnerInventoryPage"]
```

## 8. Reports, Settings, Closing, Formatting, And Shared Functions

```mermaid
flowchart TD
    Database[("Operational PostgreSQL records")] --> Dashboard["getDashboardReport"]
    Database --> Sales["getSalesHistory"]
    Database --> Profit["getProfitRows"]
    Database --> Inventory["getInventoryReport"]
    Database --> Tickets["getOrderTickets"]
    Database --> Closing["getClosingPreview<br/>getBusinessDate"]

    Dashboard --> DashboardPages["ManagerDashboardPage<br/>OwnerDashboardPage"]
    Sales --> SalesPage["OwnerSalesPage"]
    Profit --> ProfitPage["OwnerProfitPage"]
    Inventory --> InventoryPages["InventoryPage<br/>OwnerInventoryPage"]
    Tickets --> StationPages["OrdersPage<br/>KitchenPage<br/>BarPage"]
    Closing --> ClosingPage["ClosingPage<br/>saveClosing"]

    Sales --> Csv["toCsv<br/>escapeCsvValue<br/>csvResponse"]
    Profit --> Csv
    Csv --> Download["Owner CSV downloads"]

    SettingsPage["SettingsPage<br/>saveSettings"] --> SettingsFunctions["parseRestaurantSettings<br/>cleanText<br/>toNumber<br/>clamp<br/>saveRestaurantSettings"]
    SettingsFunctions --> SettingsData[("AppSetting")]
    SettingsData --> ReadSettings["getRestaurantSettings"]
    ReadSettings --> Pricing["Sale totals, receipts, and stock warnings"]

    Formatting["money<br/>compactNumber<br/>percent<br/>cn<br/>toProductView"] --> Pages["Consistent readable interface output"]
```

## 9. API Entry Point Map

```mermaid
flowchart LR
    Browser["Browser pages and components"] --> Auth["POST login<br/>GET + POST logout"]
    Browser --> Health["GET health"]
    Browser --> Products["GET + POST products"]
    Browser --> Orders["POST orders<br/>PATCH order by ID"]
    Browser --> Sales["GET + POST sales"]
    Browser --> Refunds["POST sale refund<br/>PATCH refund by ID"]
    Browser --> Void["POST sale void"]
    Browser --> Exports["GET owner sales export<br/>GET owner profit export"]

    Auth --> AuthData[("User + Role")]
    Health --> HealthData[("Database connection")]
    Products --> ProductData[("Category + Product + Recipe")]
    Orders --> OrderData[("Order + OrderItem + Table")]
    Sales --> SaleData[("Sale + Payment + StockMovement")]
    Refunds --> RefundData[("Refund + AuditLog")]
    Void --> VoidData[("Sale + StockMovement + AuditLog")]
    Exports --> ReportData[("Sales and reporting records")]
```

## 10. Database Model And Information Relationship Map

```mermaid
erDiagram
    ROLE ||--o{ USER : grants_access_to
    USER ||--o{ ORDER : serves
    USER ||--o{ SALE : processes
    USER ||--o{ STOCK_MOVEMENT : records
    USER ||--o{ EXPENSE : enters
    USER ||--o{ REFUND : requests_or_approves
    USER ||--o{ DISCOUNT : approves
    USER ||--o{ DAILY_CLOSING_REPORT : closes
    USER ||--o{ AUDIT_LOG : creates
    CATEGORY ||--o{ PRODUCT : contains
    PRODUCT ||--o{ RECIPE : consumes
    INVENTORY_ITEM ||--o{ RECIPE : supplies
    RESTAURANT_TABLE ||--o{ ORDER : hosts
    RESTAURANT_TABLE ||--o{ SALE : identifies
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : selected_as
    ORDER ||--o| SALE : becomes
    SALE ||--|{ SALE_ITEM : contains
    PRODUCT ||--o{ SALE_ITEM : sold_as
    SALE ||--o{ PAYMENT : receives
    SALE ||--o{ REFUND : may_receive
    SALE ||--o{ DISCOUNT : may_receive
    SALE ||--o{ STOCK_MOVEMENT : causes
    INVENTORY_ITEM ||--o{ STOCK_MOVEMENT : changes
    SUPPLIER ||--o{ STOCK_MOVEMENT : supplies
    DOCUMENT_SEQUENCE ||--o{ ORDER : numbers
    DOCUMENT_SEQUENCE ||--o{ SALE : numbers
    APP_SETTING ||--o{ SALE : configures
```

## 11. Maintenance, Deployment, Backup, And Recovery Functions

```mermaid
flowchart TD
    Developer["Developer changes source"] --> GitHub["GitHub repository"]
    GitHub --> Vercel["Vercel deployment"]
    Vercel --> VercelBuild["prisma migrate deploy<br/>prisma db seed<br/>next build"]
    VercelBuild --> Seed["prisma/seed.main"]
    Seed --> CloudDB[("Neon PostgreSQL")]
    VercelBuild --> Live["Live interview demo"]

    Operator["Local operator"] --> Start["start-pos.ps1<br/>Assert-Command<br/>Stop-Port<br/>Clear-NextCache"]
    Start --> Health["GET /api/health"]
    Health --> Local["Local POS"]
    Operator --> Stop["stop-pos.ps1"]

    Operator --> Release["release-check.ps1<br/>Assert-LastExitCode<br/>Get-EnvValue"]
    Release --> Checks["Lint + Prisma validation + migrations + audit + build"]

    Operator --> Backup["backup-db.ps1<br/>Get-DatabaseUrl<br/>Get-PostgresConnection<br/>Get-PostgresTool"]
    Backup --> Archive[("Timestamped PostgreSQL backup")]
    Archive --> Restore["restore-db.ps1<br/>Get-DatabaseUrl<br/>Get-PostgresConnection<br/>Get-PostgresTool"]
    Restore --> LocalDB[("Restored PostgreSQL database")]

    Operator --> LaunchData["prepare-launch-data.main<br/>verify-launch-data.main"]
    Operator --> Credentials["prepare-launch-credentials.main<br/>create-interview-reviewer.main<br/>remove-interview-reviewer.main"]
    LaunchData --> LocalDB
    Credentials --> LocalDB
```

## 12. Complete Business Process From Customer Request To Closing

```mermaid
flowchart TD
    Customer["Customer requests food or drink"] --> Staff["Waiter or cashier enters order"]
    Staff --> Validate["Session, role, product, table, and quantity validation"]
    Validate --> Tickets["Kitchen and bar tickets created"]
    Tickets --> Prepare["Items prepared and marked ready"]
    Prepare --> Serve["Order served"]
    Serve --> Pay["Cashier records payment and external reference when required"]
    Pay --> Transaction["Sale, payment, receipt, stock deduction, and audit log saved together"]
    Transaction --> Receipt["Customer receives receipt"]
    Transaction --> Reports["Dashboards and reports update"]
    Transaction --> Exceptions{"Later correction needed?"}
    Exceptions -->|Refund| Refund["Approval workflow and audit trail"]
    Exceptions -->|Void| Void["Authorized void and stock reversal"]
    Exceptions -->|No| Closing["Daily closing"]
    Refund --> Closing
    Void --> Closing
    Closing --> Export["CSV reports"]
    Export --> Backup["Private database backup"]
    Backup --> Review["Owner review and next business day"]
```

## Related Graphical Documents

- [SYSTEM GRAPHICAL PRESENTATION.html](SYSTEM%20GRAPHICAL%20PRESENTATION.html): interactive presentation for demonstrating the system
- [SYSTEM GRAPHICAL PRESENTATION PREVIEW.png](SYSTEM%20GRAPHICAL%20PRESENTATION%20PREVIEW.png): static presentation preview
- [PROJECT_FLOWCHART.md](PROJECT_FLOWCHART.md): business-process and architecture flowcharts
- [DOCUMENTATION.md](DOCUMENTATION.md): operating, setup, administration, and delivery procedures
