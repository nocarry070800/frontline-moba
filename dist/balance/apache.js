// Apache: характеристики, вооружение, таланты, прицеливание и тряска пушки.
(function(root){const settings={apache: {
      // Переключение оружия и множитель времени смены AP/HE.
      reload: {
      "switchSeconds": 1,
      "shellSwapIntervals": 2
},

      // Максимальное здоровье.
      hp: 400,

      // Тир брони: 0–3.
      armor: 1,

      // Радиус попадания/габарита, единицы карты.
      radius: 29,

      // Радиус столкновений при движении; не меняет попадания.
      moveRadius: 20,

      // Радиус обзора, единицы карты.
      vision: 480,

      // Дальность огня, единицы карты.
      range: 175,

      // Скорость движения, единицы карты/с.
      speed: 200,

      // Скорость заднего хода как доля переднего.
      reverseFactor: 1,

      // Скорость поворота корпуса, градусов/с.
      hullTurnDegrees: 110,

      // Скорость поворота орудия, градусов/с.
      turretTurnDegrees: 180,

      weapons: {
        ChainGun: {
          damageType: "HEAT",

          damageInfantry: 15,

          damageArmor: 10,

          // Интервал между выстрелами, секунды.
          interval: 0.1,

          // Исходная скорость снаряда, единицы карты/с. У артиллерии влияет на время полёта, не на дальность.
          speed: 800,

          // Радиус взрыва, единицы карты.
          radius: 16
        },

        Missiles: {
          damageType: "AP",

          // Урон до брони и дополнительных множителей.
          damage: 250,

          // Интервал между выстрелами, секунды.
          interval: 2,

          // Исходная скорость снаряда, единицы карты/с. У артиллерии влияет на время полёта, не на дальность.
          speed: 520,

          // Дальность огня, единицы карты.
          range: 175
        },

        Barrage: {
          damageType: "AP",

          // Урон до брони и дополнительных множителей.
          damage: 45,

          // Восстановление способности/заряда, секунды.
          cooldown: 35,

          count: 24,

          shotInterval: 0.07,

          // Исходная скорость снаряда, единицы карты/с. У артиллерии влияет на время полёта, не на дальность.
          speed: 600,

          // Радиус взрыва, единицы карты.
          radius: 32,

          length: 360,

          width: 50,

          startDistance: 40,

          lateralSpread: 0.6
        },

        // Воздух–воздух: клавиша 5. Захват по линии носа; затем ЛКМ.
        AirMissiles: {
          damageType: "AP",

          // Урон до брони и дополнительных множителей.
          damage: 250,

          // Интервал между выстрелами, секунды.
          interval: 12,

          // Исходная скорость снаряда, единицы карты/с. У артиллерии влияет на время полёта, не на дальность.
          speed: 650,

          // Дальность огня, единицы карты.
          range: 480,

          homingTurnDegrees: 150,

          lifetime: 12
        }
      },

      // Пары талантов по уровням: [левый, правый]. ID не менять; параметры ниже задают эффекты.
      // Текст с {параметром} подставляет число автоматически; обычные числа в text нужно обновлять вручную.
      talents: [
        // Уровень 2 — левый / правый.
        [
          {
            id: "aTurn",

            name: "Резкий разворот",

            text: "Поворот на месте быстрее на {percent}%.",

            percent: 40
          },
          {
            id: "aFlareStock",

            name: "Запасные ловушки",

            text: "Можно накопить {charges} заряда ловушек. Восстанавливаются последовательно.",

            charges: 2
          }
        ],
        // Уровень 3 — левый / правый.
        [
          {
            id: "aFocus",

            name: "Пристрелка",

            text: "Попадания пушки в одну цель: +{step}% урона, максимум +{max}%. Пауза {reset} с или смена цели сбрасывает бонус.",

            step: 5,

            max: 30,

            reset: 3
          },
          {
            id: "aSuppress",

            name: "Подавление",

            text: "Пушка замедляет пехоту на {percent}% на {duration} с.",

            percent: 20,

            duration: 1
          }
        ],
        // Уровень 4 — левый / правый.
        [
          {
            id: "aPass",

            name: "Тяжёлая боевая часть",

            text: "Урон противотанковых ракет +30%.",

            prepare: 3
          },
          {
            id: "aNarrow",

            name: "Точный барраж",

            text: "Клавиша Q сужает залп в {factor} раза без потери ракет.",

            factor: 2
          }
        ],
        // Уровень 5 — левый / правый.
        [
          {
            id: "aProximity",

            name: "Воздушный перехватчик",

            text: "Ракета воздух–воздух срабатывает в {radius} ед. от цели.",

            radius: 18
          },
          {
            id: "aPair",

            name: "Охота на броню",

            text: "Две ПТ-ракеты с интервалом {delay} с, каждая наносит {damagePercent}% урона.",

            delay: 0.25,

            damagePercent: 65
          }
        ],
        // Уровень 6 — левый / правый.
        [
          {
            id: "aEscape",

            name: "Срыв сопровождения",

            text: "Ловушки дают +{percent}% скорости на {duration} с.",

            percent: 25,

            duration: 2
          },
          {
            id: "aLongFlares",

            name: "Длительный отстрел",

            text: "Ловушки действуют в {factor} раза дольше.",

            factor: 2
          }
        ],
        // Уровень 7 — левый / правый.
        [
          {
            id: "aAcceleration",

            name: "Ускоренный разгон",

            text: "Разгон после остановки быстрее на {percent}%.",

            percent: 40
          },
          {
            id: "aRearm",

            name: "Возвращение в бой",

            text: "В ремонтной зоне способности восстанавливаются в {factor} раза быстрее.",

            factor: 2
          }
        ],
        // Уровень 8 — левый / правый.
        [
          {
            id: "aHover",

            name: "Прицельное зависание",

            text: "После {prepare} с на месте дальность пушки +{percent}%.",

            prepare: 2,

            percent: 20
          },
          {
            id: "aGunMove",

            name: "Усиленная 30-мм лента",

            text: "Урон 30-мм пушки +30%."
          }
        ],
        // Уровень 9 — левый / правый.
        [
          {
            id: "aLongBarrage",

            name: "Протяжённый залп",

            text: "Длина залпа +{lengthPercent}%, ракет +{countPercent}%.",

            lengthPercent: 50,

            countPercent: 25
          },
          {
            id: "aWideBarrage",

            name: "Огневая завеса",

            text: "Ширина залпа +{widthPercent}%, длина −{lengthReduction}%. Число ракет сохраняется.",

            widthPercent: 60,

            lengthReduction: 25
          }
        ],
        // Уровень 10 — левый / правый.
        [
          {
            id: "aGuided",

            name: "Управляемые ПТ-ракеты",

            text: "ПТ-ракеты наводятся со скоростью {turn}°/с, пока цель видна.",

            turn: 75
          },
          {
            id: "aBarrageStock",

            name: "Ракетный резерв",

            text: "Можно накопить {charges} залпа. Восстанавливаются последовательно.",

            charges: 2
          }
        ]
      ],

      acceleration: 480,

      braking: 260,

      turnSlowDegrees: 35,

      turnSpeedRetention: 0.97,

      flares: {
        // Восстановление способности/заряда, секунды.
        cooldown: 20,

        // Длительность эффекта, секунды.
        duration: 3
      }
    },weaponAimLines:{apache: {
            "ChainGun": {
                  "enabled": true,
                  "length": null,
                  "rangeMultiplier": 0.92
            },
            "Missiles": {
                  "enabled": true,
                  "length": null,
                  "rangeMultiplier": 0.92
            },
            "Barrage": {
                  "enabled": true,
                  "length": null,
                  "rangeMultiplier": 0.92
            },
            "AirMissiles": {
                  "enabled": true,
                  "length": null,
                  "rangeMultiplier": 0.92
            }
      }},level30:{},feedback:{apacheGunShake: {
        // Сила тряски, пиксели.
        strength: 1.1,

        // Радиус затухания тряски от выстрела, единицы карты.
        range: 350,

        // Длительность эффекта, секунды.
        duration: 0.12
      }}};if(typeof module!=='undefined'&&module.exports)module.exports=settings;else root.FRONTLINE_BALANCE_APACHE=settings;})(typeof globalThis!=='undefined'?globalThis:this);
