// Little Bird: тестовая машина, два минигана, таланты и столкновения.
(function(root){const settings={
  "littlebird": {
    "reload": {
      "switchSeconds": 0,
      "shellSwapIntervals": 1
    },
    "hp": 350,
    "armor": 0,
    "radius": 20,
    "moveRadius": 14,
    "vision": 400,
    "range": 96,
    "speed": 200,
    "reverseFactor": 0.5,
    "hullTurnDegrees": 125,
    "turretTurnDegrees": 125,
    "acceleration": 480,
    "movementRampSeconds": 0.2,
    "braking": 260,
    "turnSlowDegrees": 35,
    "turnSpeedRetention": 0.97,
    "weapons": {
      "ChainGun": {
        "damageType": "MG",
        "damage": 10,
        "damageInfantry": 6,
        "damageArmor": 6,
        "interval": 0.04,
        "speed": 1500,
        "radius": 0
      }
    },
    "minigunReserve": {"capacity":100,"costPerShot":2,"regenPerSecond":8},
    "flares": {"cooldown":20,"duration":3},
    // Урон от столкновений: минимальная скорость, доля максимального HP, повторный удар.
    "collision": {"minSpeed":35,"maxHpPercent":5,"cooldown":0.6},
    "talents": [
  [
    {
      "id": "lbReserve",
      "percent": 25,
      "text": "+25% боезапаса",
      "name": "lbReserve"
    },
    {
      "id": "lbRegen",
      "percent": 25,
      "text": "+25% восстановления боезапаса",
      "name": "lbRegen"
    }
  ],
  [
    {
      "id": "lbInfantry",
      "percent": 15,
      "text": "+15% урона пехоте",
      "name": "lbInfantry"
    },
    {
      "id": "lbArmor",
      "percent": 15,
      "text": "+15% урона технике",
      "name": "lbArmor"
    }
  ],
  [
    {
      "id": "lbRange",
      "percent": 15,
      "text": "+15% дальности",
      "name": "lbRange"
    },
    {
      "id": "lbSpread",
      "percent": 40,
      "text": "Разброс в движении уменьшен на 40%",
      "name": "lbSpread"
    }
  ],
  [
    {
      "id": "lbStrafe",
      "percent": 15,
      "text": "+15% скорости вбок",
      "name": "lbStrafe"
    },
    {
      "id": "lbReverse",
      "factor": 0.75,
      "text": "Скорость заднего хода — 75% от переднего",
      "name": "lbReverse"
    }
  ],
  [
    {
      "id": "lbLongFlares",
      "seconds": 2,
      "text": "Ловушки действуют на 2 секунды дольше",
      "name": "lbLongFlares"
    },
    {
      "id": "lbFlareCooldown",
      "percent": 25,
      "text": "Перезарядка ловушек уменьшена на 25%",
      "name": "lbFlareCooldown"
    }
  ],
  [
    {
      "id": "lbHull",
      "percent": 15,
      "text": "+15% максимального здоровья",
      "name": "lbHull"
    },
    {
      "id": "lbMGArmor",
      "percent": 20,
      "text": "Получаемый урон от пулемётов уменьшен на 20%",
      "name": "lbMGArmor"
    }
  ],
  [
    {
      "id": "lbEconomy",
      "percent": 20,
      "text": "Расход боезапаса уменьшен на 20%",
      "name": "lbEconomy"
    },
    {
      "id": "lbRate",
      "percent": 15,
      "text": "+15% скорострельности",
      "name": "lbRate"
    }
  ],
  [
    {
      "id": "lbAgility",
      "percent": 35,
      "text": "Разгон и смена направления быстрее на 35%",
      "name": "lbAgility"
    },
    {
      "id": "lbSpeed",
      "percent": 12,
      "text": "+12% скорости движения",
      "name": "lbSpeed"
    }
  ],
  [
    {
      "id": "lbFifth",
      "every": 5,
      "factor": 2,
      "text": "Каждая пятая пуля наносит двойной урон",
      "name": "lbFifth"
    },
    {
      "id": "lbSlow",
      "percent": 15,
      "duration": 1,
      "text": "Попадания замедляют пехоту на 15% на 1 секунду",
      "name": "lbSlow"
    }
  ],
  [
    {
      "id": "lbFlareStock",
      "charges": 2,
      "text": "Два заряда тепловых ловушек",
      "name": "lbFlareStock"
    },
    {
      "id": "lbEscape",
      "percent": 20,
      "duration": 3,
      "text": "Ловушки дают +20% скорости на 3 секунды",
      "name": "lbEscape"
    }
  ],
  [
    {
      "id": "lbQuietRegen",
      "delay": 2,
      "factor": 2,
      "text": "После 2 секунд без стрельбы восстановление боезапаса удваивается",
      "name": "lbQuietRegen"
    },
    {
      "id": "lbKillReserve",
      "percent": 30,
      "text": "Добивание техники восстанавливает 30% боезапаса",
      "name": "lbKillReserve"
    }
  ],
  [
    {
      "id": "lbRecovery",
      "delay": 8,
      "percent": 2,
      "text": "После 8 секунд без полученного урона восстанавливает 2% HP/с",
      "name": "lbRecovery"
    },
    {
      "id": "lbLowArmor",
      "threshold": 30,
      "percent": 15,
      "text": "При HP ниже 30% получает на 15% меньше урона",
      "name": "lbLowArmor"
    }
  ],
  [
    {
      "id": "lbFalloff",
      "factor": 0.5,
      "text": "За эффективной дальностью урон падает вдвое медленнее",
      "name": "lbFalloff"
    },
    {
      "id": "lbBulletSpeed",
      "percent": 25,
      "text": "+25% скорости пуль",
      "name": "lbBulletSpeed"
    }
  ],
  [
    {
      "id": "lbFocus",
      "step": 2,
      "max": 20,
      "resetSeconds": 2,
      "text": "Последовательные попадания по одной цели повышают урон на 2%, до +20%; сброс через 2 секунды без попаданий",
      "name": "lbFocus"
    },
    {
      "id": "lbFullReserve",
      "threshold": 70,
      "percent": 15,
      "text": "При запасе выше 70% урон повышается на 15%",
      "name": "lbFullReserve"
    }
  ]
]
  },
  "weaponAimLines": {
    "littlebird": {
      "ChainGun": {
        "enabled": true,
        "length": null,
        "rangeMultiplier": 0.92
      }
    }
  },
  "level30": {"littlebird":[
  {
    "id": "lbUnlimited",
    "name": "Непрерывный огонь",
    "duration": 5,
    "cooldown": 60,
    "text": "7 — 5 секунд без расхода боезапаса, перезарядка 60 секунд"
  },
  {
    "id": "lbDash",
    "name": "Рывок",
    "duration": 0.3,
    "speedFactor": 2.5,
    "cooldown": 45,
    "text": "6 — рывок в направлении движения и выпуск ловушек, перезарядка 45 секунд"
  }
]},
  "feedback": {}
};if(typeof module!=='undefined'&&module.exports)module.exports=settings;else root.FRONTLINE_BALANCE_LITTLEBIRD=settings;})(typeof globalThis!=='undefined'?globalThis:this);
