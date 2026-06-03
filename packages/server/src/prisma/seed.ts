import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("开始初始化数据库种子数据...\n");

  // ============================================================
  // 1. 创建默认科室
  // ============================================================
  const department = await prisma.department.upsert({
    where: { code: "NK" },
    update: {},
    create: {
      name: "内科",
      code: "NK",
      description: "内科病房",
      isActive: true,
    },
  });
  console.log("[科室] 创建/更新: 内科 (NK)");

  // ============================================================
  // 2. 创建默认用户（密码使用 bcryptjs 哈希）
  // ============================================================
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const nursePasswordHash = await bcrypt.hash("nurse123", 10);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      name: "系统管理员",
      isActive: true,
    },
  });
  console.log("[用户] 创建/更新: admin (系统管理员)");

  const nurseUser = await prisma.user.upsert({
    where: { username: "nk_nurse" },
    update: {},
    create: {
      username: "nk_nurse",
      passwordHash: nursePasswordHash,
      role: "nurse",
      name: "内科护士",
      departmentId: department.id,
      isActive: true,
    },
  });
  console.log("[用户] 创建/更新: nk_nurse (内科护士)");

  // ============================================================
  // 3. 创建预设项目 (PresetItem)
  // ============================================================

  // 3a. 入量 - 患者可自行录入 (permission: self)
  const intakeSelfItems = [
    { name: "饮水", unit: "ml", sortOrder: 1 },
    { name: "汤类", unit: "ml", sortOrder: 2 },
    { name: "牛奶", unit: "ml", sortOrder: 3 },
    { name: "果汁", unit: "ml", sortOrder: 4 },
    { name: "口服营养液", unit: "ml", sortOrder: 5 },
    { name: "流质饮食", unit: "ml", sortOrder: 6 },
    { name: "半流质饮食", unit: "g", sortOrder: 7 },
    { name: "水果", unit: "g", sortOrder: 8 },
  ];

  for (const item of intakeSelfItems) {
    await prisma.presetItem.upsert({
      where: {
        id: `intake_self_${item.name}`,
      },
      update: {},
      create: {
        id: `intake_self_${item.name}`,
        name: item.name,
        type: "intake",
        unit: item.unit,
        permission: "self",
        isActive: true,
        sortOrder: item.sortOrder,
        isSystem: true,
      },
    });
  }
  console.log("[预设项目] 入量(患者可录入): 饮水, 汤类, 牛奶, 果汁, 口服营养液, 流质饮食, 半流质饮食, 水果");

  // 3b. 入量 - 仅护士可录入 (permission: nurse_only)
  const intakeNurseItems = [
    { name: "静脉输液", unit: "ml", sortOrder: 10 },
    { name: "输血", unit: "ml", sortOrder: 11 },
    { name: "静脉营养", unit: "ml", sortOrder: 12 },
    { name: "管饲营养液", unit: "ml", sortOrder: 13 },
    { name: "冲管用水", unit: "ml", sortOrder: 14 },
  ];

  for (const item of intakeNurseItems) {
    await prisma.presetItem.upsert({
      where: {
        id: `intake_nurse_${item.name}`,
      },
      update: {},
      create: {
        id: `intake_nurse_${item.name}`,
        name: item.name,
        type: "intake",
        unit: item.unit,
        permission: "nurse_only",
        isActive: true,
        sortOrder: item.sortOrder,
        isSystem: true,
      },
    });
  }
  console.log("[预设项目] 入量(仅护士): 静脉输液, 输血, 静脉营养, 管饲营养液, 冲管用水");

  // 3c. 出量 - 患者可自行录入 (permission: self)
  const outputSelfItems = [
    { name: "尿量", unit: "ml", sortOrder: 1 },
    { name: "大便", unit: "ml", sortOrder: 2 },
    { name: "呕吐物", unit: "ml", sortOrder: 3 },
  ];

  for (const item of outputSelfItems) {
    await prisma.presetItem.upsert({
      where: {
        id: `output_self_${item.name}`,
      },
      update: {},
      create: {
        id: `output_self_${item.name}`,
        name: item.name,
        type: "output",
        unit: item.unit,
        permission: "self",
        isActive: true,
        sortOrder: item.sortOrder,
        isSystem: true,
      },
    });
  }
  console.log("[预设项目] 出量(患者可录入): 尿量, 大便, 呕吐物");

  // 3d. 出量 - 仅护士可录入 (permission: nurse_only)
  const outputNurseItems = [
    { name: "引流液", unit: "ml", sortOrder: 10 },
    { name: "胃管引流液", unit: "ml", sortOrder: 11 },
    { name: "透析超滤量", unit: "ml", sortOrder: 12 },
    { name: "伤口渗液", unit: "ml", sortOrder: 13 },
    { name: "汗液", unit: "ml", sortOrder: 14 },
  ];

  for (const item of outputNurseItems) {
    await prisma.presetItem.upsert({
      where: {
        id: `output_nurse_${item.name}`,
      },
      update: {},
      create: {
        id: `output_nurse_${item.name}`,
        name: item.name,
        type: "output",
        unit: item.unit,
        permission: "nurse_only",
        isActive: true,
        sortOrder: item.sortOrder,
        isSystem: true,
      },
    });
  }
  console.log("[预设项目] 出量(仅护士): 引流液, 胃管引流液, 透析超滤量, 伤口渗液, 汗液");

  // ============================================================
  // 4. 创建系统配置 (SystemConfig)
  // ============================================================
  const systemConfigs = [
    {
      configKey: "alert.oliguria_factor",
      configValue: "12",
      description: "少尿计算倍数(小时)",
    },
    {
      configKey: "alert.oliguria_default",
      configValue: "400",
      description: "少尿默认阈值(ml/24h)",
    },
    {
      configKey: "alert.polyuria",
      configValue: "2500",
      description: "多尿阈值(ml/24h)",
    },
    {
      configKey: "alert.anuria",
      configValue: "100",
      description: "无尿阈值(ml/24h)",
    },
    {
      configKey: "alert.imbalance",
      configValue: "1000",
      description: "出入量不平衡差值阈值(ml/24h)",
    },
    {
      configKey: "alert.change_percent",
      configValue: "20",
      description: "出入量变化百分比预警阈值(%)",
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { configKey: config.configKey },
      update: {},
      create: {
        configKey: config.configKey,
        configValue: config.configValue,
        description: config.description,
      },
    });
  }
  console.log("[系统配置] 创建/更新 6 条预警相关配置");

  // ============================================================
  // 5. 创建班次配置 (ShiftConfig)
  // ============================================================
  const shifts = [
    { name: "早班", startTime: "08:00", endTime: "16:00", isDefault: true },
    { name: "中班", startTime: "16:00", endTime: "00:00", isDefault: false },
    { name: "夜班", startTime: "00:00", endTime: "08:00", isDefault: false },
  ];

  for (const shift of shifts) {
    const existing = await prisma.shiftConfig.findFirst({
      where: { name: shift.name },
    });

    if (!existing) {
      await prisma.shiftConfig.create({
        data: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          isDefault: shift.isDefault,
          createdBy: adminUser.id,
        },
      });
    }
  }
  console.log("[班次配置] 创建/更新: 早班(08:00-16:00), 中班(16:00-00:00), 夜班(00:00-08:00)");

  console.log("\n数据库种子数据初始化完成!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("种子数据初始化失败:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
