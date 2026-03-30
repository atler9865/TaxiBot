# CLAUDE.md — TaxiBot Project Spec

Цей файл описує архітектуру, стек і правила проекту для AI-агента.
Читай його повністю перед тим як писати будь-який код.

---

## Проект

**TaxiBot** — Telegram-бот служби підтримки таксі з веб-адмінкою для операторів.
Монододаток: .NET 10 backend + React frontend в одному солюшні.

---

## Структура солюшну

```
TaxiBot.sln
├── TaxiBot.Api/                  ← ASP.NET Core Web API + всі фонові сервіси
│   ├── Controllers/              ← REST API ендпоінти для React
│   ├── Hubs/                     ← SignalR хаби (ChatHub)
│   ├── Services/
│   │   ├── BotService.cs         ← Telegram polling (BackgroundService)
│   │   ├── BackupService.cs      ← SQLite бекап кожні 2 год. (BackgroundService)
│   │   ├── SessionService.cs     ← стан сесій юзерів
│   │   ├── OperatorService.cs    ← реєстрація та управління операторами
│   │   └── QueueService.cs       ← черга запитів від юзерів
│   ├── Models/                   ← EF Core entities + enums
│   ├── Data/
│   │   └── AppDbContext.cs       ← єдиний DbContext
│   ├── Helpers/
│   │   └── KeyboardHelper.cs     ← Telegram inline keyboards
│   ├── wwwroot/                  ← збілдований React (Vite output)
│   └── Program.cs
│
└── TaxiBot.Web/                  ← React + Vite (тільки для dev)
    ├── src/
    │   ├── app/
    │   │   └── store.ts          ← Redux store
    │   ├── features/
    │   │   ├── auth/             ← Redux slice + Login сторінка
    │   │   ├── requests/         ← Redux slice + сторінка Requests (New/InProgress/Completed)
    │   │   ├── operators/        ← Redux slice + компоненти операторів
    │   │   └── ui/               ← Redux slice + нотифікації, маркер меню
    │   ├── services/
    │   │   ├── api.ts            ← axios instance (REST)
    │   │   └── signalr.ts        ← SignalR клієнт
    │   └── main.tsx
    ├── vite.config.ts
    └── package.json
```

---

## Backend стек

| Шар | Технологія |
|-----|-----------|
| Runtime | .NET 10 |
| Web framework | ASP.NET Core (minimal API або controllers) |
| Telegram | Telegram.Bot 21.x |
| ORM | Entity Framework Core 10 |
| База даних | SQLite (`Microsoft.EntityFrameworkCore.Sqlite`) |
| Real-time | SignalR (вбудований в ASP.NET Core) |
| Фонові сервіси | `BackgroundService` (вбудований) |
| Бекапи | `SqliteConnection.BackupDatabase()` |
| Авторизація (адмінка) | ASP.NET Core Identity + JWT Bearer |
| Локалізація (бот) | `Microsoft.Extensions.Localization` + `.resx` файли |

### Правила для Backend

- Використовуй `BackgroundService` для BotService, BackupService — не `Task.Run`.
- Весь доступ до БД через `IDbContextFactory<AppDbContext>` в фонових сервісах (не інжектуй DbContext напряму в singleton).
- SignalR хаб `ChatHub` — методи: `JoinOperatorGroup`, `SendMessage`, `EndChat`.
- REST API повертає тільки DTO, не EF-entities напряму.
- CORS налаштований для `http://localhost:5173` в development.
- В production React роздається через `app.UseStaticFiles()` + `app.MapFallbackToFile("index.html")`.
- Токен бота — через `Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN")`, ніколи не хардкодити.
- Всі `async` методи приймають `CancellationToken ct` і передають його далі.

### Авторизація (адмінка операторів)

- Оператори логіняться через `POST /api/auth/login` з логіном і паролем
- У відповідь — JWT токен, який зберігається в `localStorage` на фронті
- Всі захищені ендпоінти мають атрибут `[Authorize]`
- SignalR хаб також захищений — JWT передається як query param `?access_token=`
- Паролі хешуються через `PasswordHasher<OperatorEntity>` з ASP.NET Core Identity (без повного Identity pipeline — тільки хешер)
- Перший оператор-адмін створюється через seed при старті (`Program.cs`)

### Реєстрація та авторизація юзерів через Telegram

- Юзер може написати боту **лише після реєстрації**
- При першому `/start` — якщо юзер не зареєстрований, бот запускає флов реєстрації:
  1. Вибір мови: 🇺🇦 Українська | 🇬🇧 English | 🇵🇱 Polski | 🇷🇺 Русский
  2. Введення імені (текстове повідомлення)
  3. Введення прізвища (текстове повідомлення)
  4. Підтвердження → юзер зареєстрований, `TelegramUser` записується в БД
- Ідентифікація юзера — через `ChatId` (унікальний Telegram ID)
- Після реєстрації всі повідомлення бота надсилаються **мовою юзера** (`TelegramUser.Language`)
- Мову можна змінити пізніше через команду `/language`

### Локалізація бота

- Підтримувані мови: `uk` (українська), `en` (англійська), `pl` (польська), `ru` (російська)
- Всі рядки бота зберігаються в `.resx` файлах: `BotMessages.uk.resx`, `BotMessages.en.resx`, `BotMessages.pl.resx`, `BotMessages.ru.resx`
- Локалізація **тільки для Telegram-бота** — UI адмінки не локалізується
- Чати і повідомлення юзерів **не перекладаються** — зберігаються як є
- `IStringLocalizer<BotMessages>` інжектується в `BotService`
- При відправці будь-якого повідомлення юзеру — завжди підтягувати його `Language` з `TelegramUser`

### EF Core — таблиці

```csharp
// Основні entities
UserSession    { Id, ChatId, FirstName, Username, State, SelectedProblem, ConnectedOperatorId, CreatedAt }
OperatorEntity { Id, ChatId, Name, IsAvailable, ConnectedUserChatId, RegisteredAt }
Message        { Id, FromChatId, ToChatId, Text, SentAt, IsFromOperator }
QueueItem      { Id, UserChatId, ProblemType, MessageText, CreatedAt, Position }
```

Міграції: `dotnet ef migrations add <Name> --project TaxiBot.Api`

### Бекап

- Зберігати в `./backups/taxibot_{yyyy-MM-dd_HH-mm}.db`
- Тримати останні **5** бекапів, старіші видаляти
- Використовувати `source.BackupDatabase(destination)` — безпечно під час роботи
- Також робити бекап при старті додатку

---

## Frontend стек

| Шар | Технологія |
|-----|-----------|
| Framework | React 18 |
| Bundler | Vite |
| Мова | TypeScript |
| Стан | Redux Toolkit (`@reduxjs/toolkit`) |
| Real-time | `@microsoft/signalr` |
| HTTP | axios |
| Стилі | Tailwind CSS |
| Компоненти | shadcn/ui |
| Авторизація (фронт) | JWT в `localStorage`, axios interceptor |

### Правила для Frontend

- **Redux** — використовуй `createSlice` + `createAsyncThunk` з Redux Toolkit. Ніякого `redux-thunk` вручну.
- Структура стору: `requests`, `operators`, `auth`, `ui` слайси.
- SignalR підключення ініціалізується один раз після успішного логіну, зберігається в `signalr.ts` як singleton.
- SignalR події диспатчаться в Redux через `store.dispatch(...)` з модуля `signalr.ts`.
- Типи для всіх API-відповідей і Redux state — обов'язково.
- Компоненти — функціональні, хуки замість class components.
- `useSelector` і `useDispatch` через typed хуки (`RootState`, `AppDispatch`).
- JWT токен зберігається в `localStorage`, axios interceptor додає `Authorization: Bearer <token>` до кожного запиту.
- Захищені роути через `<PrivateRoute>` компонент — редіректить на `/login` якщо немає токена.

### Redux структура

```typescript
// store.ts
{
  auth: {
    operator: Operator | null,  // поточний залогінений оператор
    token: string | null,
    isLoading: boolean
  },
  requests: {
    newRequests: Request[],
    inProgressRequests: Request[],
    completedRequests: Request[],
    selectedRequestId: number | null,
    messages: Record<number, Message[]>,  // requestId -> messages
    unassignedCount: number,              // для маркера в меню
    isLoading: boolean
  },
  operators: {
    list: Operator[]
  },
  ui: {
    notifications: Notification[]
  }
}
```

### Збірка в продакшн

```bash
cd TaxiBot.Web
npm run build        # output → ../TaxiBot.Api/wwwroot/
```

`vite.config.ts` повинен мати `outDir: '../TaxiBot.Api/wwwroot'`.

---

## Сценарій роботи (бізнес-логіка)

### Повний флов

**Реєстрація (перший запуск):**
1. Юзер пише `/start` → бот перевіряє чи є `TelegramUser` з цим `ChatId`
2. Якщо не зареєстрований → флов реєстрації:
   - Вибір мови: 🇺🇦 Українська | 🇬🇧 English | 🇵🇱 Polski | 🇷🇺 Русский
   - Введення імені → введення прізвища → підтвердження
   - `TelegramUser` записується в БД, `IsRegistered = true`
3. Бот вітає юзера **обраною мовою** і показує головне меню

**Основний флов (зареєстрований юзер):**
1. Юзер пише `/start` → головне меню (мовою юзера)
2. Юзер обирає "Написати менеджеру" → вибір типу проблеми (6 варіантів, мовою юзера)
3. Юзер описує проблему →
   - створюється `Request` зі статусом `New`
   - через SignalR всі оператори в браузері **миттєво** бачать новий реквест на сторінці Requests (таб **New**)
   - в меню адмінки біля "Requests" загорається **маркер** (лічильник незаасайнених реквестів)
   - юзеру в боті (його мовою): _"Ваш запит прийнято, очікуйте оператора"_
4. Оператор відкриває реквест у браузері → натискає **Assign to me** →
   - `Request.AssignedOperatorId` = id оператора, статус → `InProgress`
   - реквест переходить у таб **In Progress**
   - маркер в меню зменшується (або зникає якщо незаасайнених більше немає)
   - юзеру в боті (його мовою): _"Оператор {Ім'я} підключився до чату"_
5. Листування: оператор пише у веб-інтерфейсі → повідомлення зберігається в `Message` → через SignalR відображається в реквесті → через Telegram Bot API надсилається юзеру, і навпаки
6. Всі повідомлення дублюються у веб-додаток і зберігаються в `Message`, прив'язаному до `Request.Id` — це і є історія чату
7. Завершення чату — два варіанти:
   - **Оператор** натискає **Complete Request** → статус → `Completed`, реквест → таб **Completed**, юзеру в боті (його мовою): _"Оператор завершив чат"_
   - **Юзер** натискає кнопку **End Chat** в боті → статус → `Completed`, реквест → таб **Completed**, оператору в браузері сповіщення через SignalR
8. Після завершення: `TelegramUser` залишається зареєстрованим, може подати новий запит

---

### Сторінка Requests (адмінка)

**Три таби:** `New` | `In Progress` | `Completed`

**Картка реквесту містить:**
- Тема (вибрана юзером `ProblemType`)
- Перше повідомлення юзера
- Ім'я та username юзера
- Дата створення
- Заасайнений оператор (або "Unassigned")

**Маркер в меню:**
- Показує кількість реквестів зі статусом `New` (незаасайнених)
- Загорається при надходженні нового реквесту через SignalR
- Зникає коли всі реквести заасайнені або завершені

**Відкритий реквест (детальний вигляд):**
- Вся історія повідомлень (як чат)
- Кнопка **Assign to me** (якщо статус `New`)
- Поле вводу + кнопка відправки (якщо статус `InProgress` і оператор = поточний)
- Кнопка **Complete Request** (якщо статус `InProgress` і оператор = поточний)

---

### SignalR події (ChatHub)

| Подія | Напрямок | Опис |
|-------|----------|------|
| `RequestCreated` | Server → всі оператори | новий реквест з'явився в таб New |
| `RequestAssigned` | Server → всі оператори | реквест заасайнено, переходить в In Progress |
| `RequestCompleted` | Server → всі оператори | реквест завершено |
| `NewMessage` | Server → оператор реквесту | нове повідомлення від юзера |
| `OperatorMessage` | Server → бот (внутрішньо) | повідомлення оператора → пересилається юзеру в Telegram |
| `UnassignedCountChanged` | Server → всі оператори | оновлення лічильника маркера в меню |

---

### EF Core — оновлена схема

```csharp
TelegramUser {
    Id, ChatId,
    FirstName, LastName,    // вводяться при реєстрації
    Username,               // з Telegram (може бути null)
    Language,               // "uk" | "en" | "pl" | "ru"
    IsRegistered,
    RegisteredAt
}

OperatorEntity {
    Id, Login, PasswordHash,
    FirstName, LastName,
    IsAvailable, RegisteredAt
}

Request {
    Id, TelegramUserId,
    ProblemType, InitialMessage,
    Status,              // New | InProgress | Completed
    AssignedOperatorId,  // null якщо New
    CreatedAt, AssignedAt, CompletedAt
}

Message {
    Id, RequestId,
    SenderTelegramUserId, // null якщо від оператора
    SenderOperatorId,     // null якщо від юзера
    Text, SentAt, IsFromOperator
}
```

**Статуси реквесту:**
```csharp
public enum RequestStatus
{
    New = 1,         // створено, не заасайнено
    InProgress = 2,  // заасайнено оператору
    Completed = 3    // завершено
}
```

### Типи проблем

```csharp
public enum ProblemType
{
    Accident = 1,       // Аварія
    LateDriver = 2,     // Водій запізнюється
    WrongRoute = 3,     // Невірний маршрут
    PaymentIssue = 4,   // Проблема з оплатою
    DriverBehavior = 5, // Поведінка водія
    Other = 6           // Інше
}
```

---

## Що вже реалізовано

- [x] `BotService` — базовий Telegram polling (потребує переробки під новий флов з реєстрацією)
- [x] `KeyboardHelper` — inline keyboards (потребує розширення для вибору мови)
- [x] `BackupService` — SQLite бекап з ротацією
- [ ] EF Core + міграції (`TelegramUser`, `OperatorEntity`, `Request`, `Message`)
- [ ] `RegistrationService` — флов реєстрації юзера з вибором мови
- [ ] Локалізація бота — `.resx` файли для `uk`, `en`, `pl`, `ru`
- [ ] `RequestService` — створення, assign, complete, отримання по статусу
- [ ] REST API: `AuthController` (login/JWT), `RequestsController`, `OperatorsController`
- [ ] SignalR `ChatHub` з усіма подіями
- [ ] React адмінка — Login сторінка + сторінка Requests з трьома табами
- [ ] Redux store — слайси `auth`, `requests`, `operators`, `ui`
- [ ] Маркер в меню адмінки (live через SignalR `UnassignedCountChanged`)

---

## Команди

```bash
# Backend
dotnet run --project TaxiBot.Api
dotnet ef migrations add Init --project TaxiBot.Api
dotnet ef database update --project TaxiBot.Api

# Frontend (dev)
cd TaxiBot.Web && npm run dev

# Frontend (prod build)
cd TaxiBot.Web && npm run build

# Env
export TELEGRAM_BOT_TOKEN=your_token_here
```

---

## Важливі правила для агента

1. **Не порушуй структуру солюшну** — два проекти, чітко розділені.
2. **Не інжектуй `DbContext` як singleton** — тільки через `IDbContextFactory`.
3. **Не хардкодь токен боту** — тільки через env змінну.
4. **SignalR і REST — паралельно**, не замість одне одного. REST для CRUD, SignalR для live подій.
5. **Redux Toolkit** — тільки `createSlice` + `createAsyncThunk`, без старого `redux` API.
6. **Типи TypeScript** — обов'язкові для всіх Redux state, API відповідей і пропсів компонентів.
7. **Tailwind + shadcn** — для стилів, не писати кастомний CSS якщо є готовий компонент.
8. **Бекап при старті** — `BackupService` робить бекап одразу при запуску, не чекає 2 години.
9. **CancellationToken** — передавати скрізь де є async операції.
10. **Міграції перед запуском** — `AppDbContext` має `Database.MigrateAsync()` в `Program.cs`.
11. **Центральна сутність — `Request`** — всі повідомлення прив'язані до `Request.Id`.
12. **Маркер меню** — `unassignedCount` в Redux оновлюється **тільки через SignalR** подію `UnassignedCountChanged`, не через polling.
13. **Assign може тільки поточний оператор** — перевірка `AssignedOperatorId == currentOperator.Id` перед показом кнопок Complete/Send.
14. **Completed реквести — read-only** — після переходу в `Completed` жодних змін, тільки перегляд історії.
15. **Незареєстрований юзер не може писати** — перша перевірка в `BotService`: якщо `TelegramUser` не знайдено або `IsRegistered = false` → запустити флов реєстрації, ігнорувати всі інші команди.
16. **Локалізація тільки для бота** — UI адмінки не локалізується. Чати не перекладаються.
17. **Мова юзера** — при кожному відправленні повідомлення юзеру завжди підтягувати `TelegramUser.Language` з БД і використовувати відповідний `IStringLocalizer`.
18. **Жорстка типізація мов** — використовуй enum або константи `"uk" | "en" | "pl" | "ru"`, не довільні рядки.
19. **JWT для адмінки** — всі `/api/*` ендпоінти (крім `/api/auth/login`) мають `[Authorize]`. SignalR хаб також захищений.
20. **Seed оператора** — при першому запуску якщо в БД немає жодного оператора — створити дефолтного адміна через `IServiceScope` в `Program.cs`.
