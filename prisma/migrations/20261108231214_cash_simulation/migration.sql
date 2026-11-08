-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delayInvoiceId" TEXT,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "newExpenseAmount" DECIMAL,
    "newExpenseDate" DATETIME,
    "newExpenseLabel" TEXT NOT NULL DEFAULT 'Simulated expense',
    "expectedIncomeAmount" DECIMAL,
    "expectedIncomeDate" DATETIME,
    "expectedIncomeLabel" TEXT NOT NULL DEFAULT 'Simulated income',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Simulation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Simulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Simulation_companyId_createdAt_idx" ON "Simulation"("companyId", "createdAt");
