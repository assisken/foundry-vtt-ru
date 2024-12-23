import { setupBabele } from "../shared.js";

export function init() {
	/* Регистрация настроек */
	game.settings.register("ru-ru", "compendiumTranslation", {
		name: "(D&D5E) Перевод библиотек",
		hint: "(Требуется модуль Babele) Библиотеки системы D&D5E будут переведены.",
		type: Boolean,
		default: true,
		scope: "world",
		config: true,
		restricted: true,
		onChange: (value) => {
			window.location.reload();
		},
	});

	/* Регистрация Babele */
	if (game.settings.get("ru-ru", "compendiumTranslation")) {
		/* Библиотеки D&D */
		game.settings.get("ru-ru", "altTranslation")
			? setupBabele("dnd5e/ps")
			: setupBabele("dnd5e/hw");

		/* Библиотеки Ruins of Symbaroum */
		if (game.modules.get("symbaroum5ecore")?.active) {
			setupBabele("dnd5e/ros");
		}

		game.babele.registerConverters({
			dndpages(pages, translations) {
				return pages.map((data) => {
					if (!translations) {
						return data;
					}

					let translation;

					if (Array.isArray(translations)) {
						translation = translations.find((t) => t.id === data._id || t.id === data.name);
					} else {
						translation = translations[data.name];
					}

					if (!translation) {
						return data;
					}

					return mergeObject(data, {
						name: translation.name,
						image: { caption: translation.caption ?? data.image?.caption },
						src: translation.src ?? data.src,
						text: { content: translation.text ?? data.text?.content },
						video: {
							width: translation.width ?? data.video?.width,
							height: translation.height ?? data.video?.height,
						},
						system: { tooltip: translation.tooltip ?? data.system.tooltip },
						translated: true,
					});
				});
			},
		});
	} else {
		if (game.settings.get("ru-ru", "compendiumTranslation")) {
			new Dialog({
				title: "Перевод библиотек",
				content:
					"<p>Для перевода библиотек системы D&D5E требуется активировать модуль <b>Babele</b>. Вы можете отключить перевод библиотек в настройках модуля</p>",
				buttons: {
					done: {
						label: "Хорошо",
					},
					never: {
						label: "Больше не показывать",
						callback: () => {
							game.settings.set("ru-ru", "compendiumTranslation", false);
						},
					},
				},
			}).render(true);
		}
	}

	/*  Настройка автоопределения анимаций AA  */
	Hooks.on("renderSettingsConfig", (app, html, data) => {
		if (!game.user.isGM) return;

		const lastMenuSetting = html
			.find(`input[name="ru-ru.compendiumTranslation"]`)
			.closest(".form-group");

		const updateAAButton = $(`
  <label>
    Перед переводом анимаций требуется включить модули Automated Animations, D&D5E Animations, JB2A Patreon
  </label>
  <div class="form-group">
      <button type="button">
          <i class="fas fa-cogs"></i>
          <label>Перевести анимации</label>
      </button>
  </div>
  `);
		updateAAButton.find("button").click((e) => {
			e.preventDefault();
			updateAA();
		});

		lastMenuSetting.after(updateAAButton);
	});
}

/* Обновление базы AA */
async function updateAA() {
	const translatedSettings = await foundry.utils.fetchJsonWithTimeout(
		"/modules/ru-ru/i18n/modules/aa-autorec.json",
	);

	const currentSettings = AutomatedAnimations.AutorecManager.getAutorecEntries();

	const newSettings = {
		melee: mergeArrays(currentSettings.melee, translatedSettings.melee),
		range: mergeArrays(currentSettings.range, translatedSettings.range),
		ontoken: mergeArrays(currentSettings.ontoken, translatedSettings.ontoken),
		templatefx: mergeArrays(currentSettings.templatefx, translatedSettings.templatefx),
		aura: mergeArrays(currentSettings.aura, translatedSettings.aura),
		preset: mergeArrays(currentSettings.preset, translatedSettings.preset),
		aefx: mergeArrays(currentSettings.aefx, translatedSettings.aefx),
		version: "5",
	};

	AutomatedAnimations.AutorecManager.overwriteMenus(JSON.stringify(newSettings), {
		submitAll: true,
	});
}

function mergeArrays(array1, array2) {
	const labelMap = new Map(array2.map((item) => [item.metaData.label, item]));

	return array1.map((item) => {
		const matchingItem = labelMap.get(item.metaData.label);
		return matchingItem ? { ...item, ...matchingItem } : item;
	});
}
