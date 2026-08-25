/* ============================================================
 * 数据文件 —— 参考《某二战题材slg战棋单位设计.xlsx》与
 * 《某二战题材SLG战棋策划案》，由 ww2/data/*.json 转换而来。
 * 改数值 = 改游戏，无需改逻辑。
 * ============================================================ */

// 单位（id -> 定义），16 种兵种
const UNITS = {
    "基础步兵":  {
                 "id":  "基础步兵",
                 "name":  "基础步兵",
                 "category":  "步兵",
                 "hp":  200,
                 "attack":  40,
                 "defense":  20,
                 "move":  5,
                 "initiative":  5,
                 "equip_slots":  1,
                 "armor":  0,
                 "anti_armor":  6,
                 "sight":  4,
                 "range_min":  1,
                 "range_max":  1,
                 "attack_method":  "枪械",
                 "cost":  {
                              "recruit":  120,
                              "steel":  0
                          }
             },
    "轻步兵":  {
                "id":  "轻步兵",
                "name":  "轻步兵",
                "category":  "步兵",
                "hp":  180,
                "attack":  30,
                "defense":  18,
                "move":  7,
                "initiative":  7,
                "equip_slots":  0,
                "armor":  0,
                "anti_armor":  4,
                "sight":  5,
                "range_min":  1,
                "range_max":  1,
                "attack_method":  "枪械",
                "cost":  {
                             "recruit":  100,
                             "steel":  0
                         }
            },
    "重步兵":  {
                "id":  "重步兵",
                "name":  "重步兵",
                "category":  "步兵",
                "hp":  240,
                "attack":  55,
                "defense":  30,
                "move":  5,
                "initiative":  5,
                "equip_slots":  1,
                "armor":  0,
                "anti_armor":  7,
                "sight":  4,
                "range_min":  1,
                "range_max":  1,
                "attack_method":  "枪械",
                "cost":  {
                             "recruit":  130,
                             "steel":  10
                         }
            },
    "突击步兵":  {
                 "id":  "突击步兵",
                 "name":  "突击步兵",
                 "category":  "步兵",
                 "hp":  220,
                 "attack":  45,
                 "defense":  20,
                 "move":  6,
                 "initiative":  6,
                 "equip_slots":  1,
                 "armor":  0,
                 "anti_armor":  4,
                 "sight":  5,
                 "range_min":  1,
                 "range_max":  1,
                 "attack_method":  "冲锋枪",
                 "cost":  {
                              "recruit":  130,
                              "steel":  0
                          }
             },
    "机枪装甲车":  {
                  "id":  "机枪装甲车",
                  "name":  "机枪装甲车",
                  "category":  "载具",
                  "hp":  300,
                  "attack":  55,
                  "defense":  30,
                  "move":  7,
                  "initiative":  8,
                  "equip_slots":  1,
                  "armor":  8,
                  "anti_armor":  5,
                  "sight":  7,
                  "range_min":  1,
                  "range_max":  1,
                  "attack_method":  "机枪",
                  "cost":  {
                               "recruit":  160,
                               "steel":  20
                           }
              },
    "机炮装甲车":  {
                  "id":  "机炮装甲车",
                  "name":  "机炮装甲车",
                  "category":  "载具",
                  "hp":  300,
                  "attack":  60,
                  "defense":  30,
                  "move":  7,
                  "initiative":  8,
                  "equip_slots":  1,
                  "armor":  8,
                  "anti_armor":  5,
                  "sight":  7,
                  "range_min":  1,
                  "range_max":  1,
                  "attack_method":  "机炮",
                  "cost":  {
                               "recruit":  160,
                               "steel":  20
                           }
              },
    "机枪轻坦":  {
                 "id":  "机枪轻坦",
                 "name":  "机枪轻坦",
                 "category":  "载具",
                 "hp":  360,
                 "attack":  55,
                 "defense":  35,
                 "move":  8,
                 "initiative":  6,
                 "equip_slots":  1,
                 "armor":  10,
                 "anti_armor":  7,
                 "sight":  6,
                 "range_min":  1,
                 "range_max":  1,
                 "attack_method":  "机枪",
                 "cost":  {
                              "recruit":  180,
                              "steel":  35
                          }
             },
    "机炮轻坦":  {
                 "id":  "机炮轻坦",
                 "name":  "机炮轻坦",
                 "category":  "载具",
                 "hp":  360,
                 "attack":  60,
                 "defense":  35,
                 "move":  8,
                 "initiative":  6,
                 "equip_slots":  1,
                 "armor":  10,
                 "anti_armor":  7,
                 "sight":  6,
                 "range_min":  1,
                 "range_max":  1,
                 "attack_method":  "机炮",
                 "cost":  {
                              "recruit":  180,
                              "steel":  35
                          }
             },
    "中坦":  {
               "id":  "中坦",
               "name":  "中坦",
               "category":  "载具",
               "hp":  400,
               "attack":  75,
               "defense":  40,
               "move":  7,
               "initiative":  5,
               "equip_slots":  1,
               "armor":  14,
               "anti_armor":  12,
               "sight":  5,
               "range_min":  1,
               "range_max":  1,
               "attack_method":  "坦克炮",
               "cost":  {
                            "recruit":  200,
                            "steel":  50
                        }
           },
    "重坦":  {
               "id":  "重坦",
               "name":  "重坦",
               "category":  "载具",
               "hp":  600,
               "attack":  90,
               "defense":  50,
               "move":  6,
               "initiative":  5,
               "equip_slots":  2,
               "armor":  20,
               "anti_armor":  18,
               "sight":  4,
               "range_min":  1,
               "range_max":  2,
               "attack_method":  "坦克炮",
               "cost":  {
                            "recruit":  260,
                            "steel":  70
                        },
               "attack_alt":  75
           },
    "轻型火炮":  {
                 "id":  "轻型火炮",
                 "name":  "轻型火炮",
                 "category":  "火炮",
                 "hp":  240,
                 "attack":  60,
                 "defense":  10,
                 "move":  5,
                 "initiative":  4,
                 "equip_slots":  1,
                 "armor":  0,
                 "anti_armor":  8,
                 "sight":  4,
                 "range_min":  1,
                 "range_max":  2,
                 "attack_method":  "火炮",
                 "cost":  {
                              "recruit":  100,
                              "steel":  10
                          }
             },
    "中型火炮":  {
                 "id":  "中型火炮",
                 "name":  "中型火炮",
                 "category":  "火炮",
                 "hp":  300,
                 "attack":  70,
                 "defense":  15,
                 "move":  4,
                 "initiative":  4,
                 "equip_slots":  1,
                 "armor":  0,
                 "anti_armor":  12,
                 "sight":  4,
                 "range_min":  1,
                 "range_max":  3,
                 "attack_method":  "火炮",
                 "cost":  {
                              "recruit":  130,
                              "steel":  20
                          }
             },
    "重型火炮":  {
                 "id":  "重型火炮",
                 "name":  "重型火炮",
                 "category":  "火炮",
                 "hp":  360,
                 "attack":  90,
                 "defense":  20,
                 "move":  4,
                 "initiative":  4,
                 "equip_slots":  2,
                 "armor":  0,
                 "anti_armor":  15,
                 "sight":  4,
                 "range_min":  2,
                 "range_max":  3,
                 "attack_method":  "火炮",
                 "cost":  {
                              "recruit":  175,
                              "steel":  30
                          }
             },
    "轻型反坦克炮":  {
                   "id":  "轻型反坦克炮",
                   "name":  "轻型反坦克炮",
                   "category":  "火炮",
                   "hp":  240,
                   "attack":  55,
                   "defense":  10,
                   "move":  5,
                   "initiative":  4,
                   "equip_slots":  1,
                   "armor":  0,
                   "anti_armor":  15,
                   "sight":  4,
                   "range_min":  1,
                   "range_max":  2,
                   "attack_method":  "反载具武器",
                   "cost":  {
                                "recruit":  110,
                                "steel":  10
                            }
               },
    "中型反坦克炮":  {
                   "id":  "中型反坦克炮",
                   "name":  "中型反坦克炮",
                   "category":  "火炮",
                   "hp":  300,
                   "attack":  65,
                   "defense":  15,
                   "move":  4,
                   "initiative":  4,
                   "equip_slots":  1,
                   "armor":  0,
                   "anti_armor":  18,
                   "sight":  4,
                   "range_min":  1,
                   "range_max":  3,
                   "attack_method":  "反载具武器",
                   "cost":  {
                                "recruit":  135,
                                "steel":  35
                            }
               },
    "重型反坦克炮":  {
                   "id":  "重型反坦克炮",
                   "name":  "重型反坦克炮",
                   "category":  "火炮",
                   "hp":  360,
                   "attack":  80,
                   "defense":  20,
                   "move":  4,
                   "initiative":  4,
                   "equip_slots":  2,
                   "armor":  0,
                   "anti_armor":  25,
                   "sight":  4,
                   "range_min":  2,
                   "range_max":  3,
                   "attack_method":  "反载具武器",
                   "cost":  {
                                "recruit":  175,
                                "steel":  45
                            }
               }
};

// 地形（id -> 定义）。move_cost 移动消耗(-1=不可通行)，defense_bonus 防御加成，color 显示色，foot_only 仅步兵可通行
const TERRAINS = {
    "平原":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#7a9f4d"
           },
    "丘陵":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  2,
               "defense_bonus":  1,
               "color":  "#9aa04d"
           },
    "山地":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  3,
               "defense_bonus":  2,
               "color":  "#8a8a8a",
               "foot_only":  true
           },
    "森林":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  2,
               "defense_bonus":  1,
               "color":  "#2d6b2d"
           },
    "沼泽":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  2,
               "defense_bonus":  0,
               "color":  "#5a7a6a"
           },
    "海岸":  {
               "category":  "natural",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#c2b280"
           },
    "海洋":  {
               "category":  "natural",
               "passable":  false,
               "move_cost":  -1,
               "defense_bonus":  0,
               "color":  "#2a6db0"
           },
    "市中心":  {
                "category":  "building",
                "passable":  true,
                "move_cost":  1,
                "defense_bonus":  1,
                "color":  "#b04a3a",
                "capturable":  true
            },
    "城市外围":  {
                 "category":  "building",
                 "passable":  true,
                 "move_cost":  1,
                 "defense_bonus":  0,
                 "color":  "#c06a4a",
                 "capturable":  true
             },
    "工厂":  {
               "category":  "building",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  1,
               "color":  "#5a5a6a",
               "capturable":  true
           },
    "机场":  {
               "category":  "building",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#4a6a8a",
               "capturable":  true
           },
    "农村":  {
               "category":  "building",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#b0a04a",
               "capturable":  true
           },
    "农田":  {
               "category":  "building",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#a0a04a"
           },
    "碉堡":  {
               "category":  "building",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  3,
               "color":  "#4a4a4a"
           },
    "扩展跑道":  {
                 "category":  "building",
                 "passable":  true,
                 "move_cost":  1,
                 "defense_bonus":  0,
                 "color":  "#6a6a6a"
             },
    "公路":  {
               "category":  "road",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#6b6b6b"
           },
    "乡道":  {
               "category":  "road",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#7b6b5b"
           },
    "铁路":  {
               "category":  "road",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#4b4b4b"
           },
    "桥梁":  {
               "category":  "road",
               "passable":  true,
               "move_cost":  1,
               "defense_bonus":  0,
               "color":  "#5b5b5b"
           }
};

// 攻击方式 × 目标兵种(步兵/载具/火炮) 的伤害倍率
const ATTACK_METHODS = {
    "枪械":  {
               "步兵":  1,
               "载具":  0.85,
               "火炮":  1.2
           },
    "冲锋枪":  {
                "步兵":  1.2,
                "载具":  0.67,
                "火炮":  1.3
            },
    "机枪":  {
               "步兵":  1,
               "载具":  0.9,
               "火炮":  1.3
           },
    "机炮":  {
               "步兵":  1.1,
               "载具":  0.95,
               "火炮":  1.4
           },
    "坦克炮":  {
                "步兵":  1.2,
                "载具":  1,
                "火炮":  1.5
            },
    "火炮":  {
               "步兵":  1.5,
               "载具":  1.1,
               "火炮":  1.5
           },
    "反载具武器":  {
                  "步兵":  0.9,
                  "载具":  1.5,
                  "火炮":  1.2
              }
};

// 穿甲倍率查找表（反装甲/装甲 比值 -> 倍率）
const ARMOR_PEN_RULES = [
    {
        "min":  1.2,
        "max":  null,
        "min_inclusive":  false,
        "max_inclusive":  false,
        "mult":  2,
        "name":  "深穿"
    },
    {
        "min":  1,
        "max":  1.2,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  1.3,
        "name":  "穿甲"
    },
    {
        "min":  0.8,
        "max":  1,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  1,
        "name":  "可穿"
    },
    {
        "min":  0.5,
        "max":  0.8,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  0.7,
        "name":  "未穿"
    },
    {
        "min":  null,
        "max":  0.5,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  0.5,
        "name":  "跳弹"
    }
];

// 主动性差值倍率查找表
const INITIATIVE_RULES = [
    {
        "min":  5,
        "max":  null,
        "min_inclusive":  false,
        "max_inclusive":  false,
        "mult":  2
    },
    {
        "min":  3,
        "max":  5,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  1.5
    },
    {
        "min":  1,
        "max":  3,
        "min_inclusive":  false,
        "max_inclusive":  true,
        "mult":  1.3
    },
    {
        "min":  1,
        "max":  1,
        "min_inclusive":  true,
        "max_inclusive":  true,
        "mult":  1.2
    },
    {
        "min":  -3,
        "max":  1,
        "min_inclusive":  false,
        "max_inclusive":  false,
        "mult":  1
    },
    {
        "min":  null,
        "max":  -3,
        "min_inclusive":  false,
        "max_inclusive":  false,
        "mult":  0.8
    }
];

// 士气（mult 攻防倍率，random_add 随机数基数影响，move_add 移动影响，-999=无法移动）
const MORALE = {
    "极高":  {
               "mult":  1.5,
               "random_add":  0.2,
               "move_add":  1
           },
    "高":  {
              "mult":  1.3,
              "random_add":  0.15,
              "move_add":  0
          },
    "无":  {
              "mult":  1,
              "random_add":  0,
              "move_add":  0
          },
    "低落":  {
               "mult":  0.8,
               "random_add":  -0.07,
               "move_add":  0
           },
    "混乱":  {
               "mult":  0.5,
               "random_add":  -0.15,
               "move_add":  -999
           },
    "受困":  {
               "mult":  0.6,
               "random_add":  -0.1,
               "move_add":  -998
           }
};
// 建筑（城镇）定义：produces 产出资源类型(recruit/steel/air)，can_produce 可生产单位，levels[等级].income 每回合产出
const BUILDINGS = {
    "城市":  {
               "name":  "城市",
               "produces":  "recruit",
               "can_produce":  [
                                   "基础步兵",
                                   "轻步兵",
                                   "重步兵",
                                   "突击步兵"
                               ],
               "levels":  {
                              "1":  {
                                        "income":  20,
                                        "slots":  1,
                                        "upgrade_cost":  null
                                    },
                              "2":  {
                                        "income":  35,
                                        "slots":  1,
                                        "upgrade_cost":  {
                                                             "recruit":  170,
                                                             "steel":  20
                                                         }
                                    },
                              "3":  {
                                        "income":  55,
                                        "slots":  2,
                                        "upgrade_cost":  {
                                                             "recruit":  260,
                                                             "steel":  40
                                                         }
                                    },
                              "4":  {
                                        "income":  80,
                                        "slots":  2,
                                        "upgrade_cost":  {
                                                             "recruit":  350,
                                                             "steel":  60
                                                         }
                                    },
                              "5":  {
                                        "income":  120,
                                        "slots":  3,
                                        "upgrade_cost":  {
                                                             "recruit":  440,
                                                             "steel":  80
                                                         }
                                    }
                          }
           },
    "工厂":  {
               "name":  "工厂",
               "produces":  "steel",
               "can_produce":  [
                   "机枪装甲车",
                   "机炮装甲车",
                   "机枪轻坦",
                   "机炮轻坦",
                   "中坦",
                   "重坦",
                   "轻型火炮",
                   "中型火炮",
                   "重型火炮",
                   "轻型反坦克炮",
                   "中型反坦克炮",
                   "重型反坦克炮"
               ],
               "levels":  {
                              "1":  {
                                        "income":  10,
                                        "slots":  1,
                                        "upgrade_cost":  null
                                    },
                              "2":  {
                                        "income":  25,
                                        "slots":  1,
                                        "upgrade_cost":  {
                                                             "recruit":  100,
                                                             "steel":  40
                                                         }
                                    },
                              "3":  {
                                        "income":  45,
                                        "slots":  2,
                                        "upgrade_cost":  {
                                                             "recruit":  180,
                                                             "steel":  70
                                                         }
                                    },
                              "4":  {
                                        "income":  70,
                                        "slots":  2,
                                        "upgrade_cost":  {
                                                             "recruit":  260,
                                                             "steel":  100
                                                         }
                                    },
                              "5":  {
                                        "income":  100,
                                        "slots":  3,
                                        "upgrade_cost":  {
                                                             "recruit":  340,
                                                             "steel":  150
                                                         }
                                    }
                          }
           },
    "农村":  {
               "name":  "农村",
               "produces":  "recruit",
               "can_produce":  [

                               ],
               "levels":  {
                              "1":  {
                                        "income":  10,
                                        "slots":  0,
                                        "upgrade_cost":  null
                                    },
                              "2":  {
                                        "income":  25,
                                        "slots":  0,
                                        "upgrade_cost":  {
                                                             "recruit":  100,
                                                             "steel":  0
                                                         }
                                    },
                              "3":  {
                                        "income":  45,
                                        "slots":  0,
                                        "upgrade_cost":  {
                                                             "recruit":  180,
                                                             "steel":  0
                                                         }
                                    },
                              "4":  {
                                        "income":  70,
                                        "slots":  0,
                                        "upgrade_cost":  {
                                                             "recruit":  260,
                                                             "steel":  0
                                                         }
                                    },
                              "5":  {
                                        "income":  100,
                                        "slots":  0,
                                        "upgrade_cost":  {
                                                             "recruit":  340,
                                                             "steel":  0
                                                         }
                                    }
                          }
           },
    "机场":  {
               "name":  "机场",
               "produces":  "air",
               "can_produce":  [

                               ],
               "levels":  {
                              "1":  {
                                        "income":  2,
                                        "slots":  1,
                                        "upgrade_cost":  null
                                    },
                              "2":  {
                                        "income":  3,
                                        "slots":  2,
                                        "upgrade_cost":  {
                                                             "recruit":  100,
                                                             "steel":  40
                                                         }
                                    },
                              "3":  {
                                        "income":  5,
                                        "slots":  3,
                                        "upgrade_cost":  {
                                                             "recruit":  180,
                                                             "steel":  70
                                                         }
                                    },
                              "4":  {
                                        "income":  7,
                                        "slots":  4,
                                        "upgrade_cost":  {
                                                             "recruit":  260,
                                                             "steel":  100
                                                         }
                                    },
                              "5":  {
                                        "income":  10,
                                        "slots":  5,
                                        "upgrade_cost":  {
                                                             "recruit":  340,
                                                             "steel":  150
                                                         }
                                    }
                          }
           }
};

