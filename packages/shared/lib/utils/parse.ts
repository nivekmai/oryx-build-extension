enum Keyboard {
  ergodox_ez = 'ergodox_ez',
  ergodox_ez_st = 'ergodox_ez_st',
  planck_ez = 'planck_ez',
  moonlander = 'moonlander',
  voyager = 'voyager',
  unknown = 'unknown',
}

enum Chipset {
  stm = 'stm',
  stm32 = 'stm32',
  m32u4 = 'm32u4',
  unspecified = 'unspecified',
}

enum Model {
  original = 'original',
  glow = 'glow',
  shine = 'shine',
  unspecified = 'unspecified',
}

export class QmkLayout {
  id: string;
  keyboard: Keyboard = Keyboard.unknown;
  chipset: Chipset = Chipset.unspecified;
  model: Model = Model.unspecified;
  error?: Error;

  constructor(_id: string, _keyboard: Keyboard, _chipset: Chipset, _model: Model, _error?: Error) {
    this.id = _id;
    if (Keyboard[_keyboard]) {
      const { keyboard, chipset } = QmkLayout._ergodoxish(_keyboard)
        ? QmkLayout._ergodoxAndChipset(_keyboard)
        : {
            keyboard: Keyboard[_keyboard] ?? Keyboard.unknown,
            chipset: Chipset[_chipset] ?? Chipset.unspecified,
          };
      this.error = _error;
      this.keyboard = keyboard;
      this.chipset = chipset;
    }
    this.model = Model[_model] ? (_model as Model) : Model.unspecified;
  }

  static from(id: string, keyboard: string, chipset?: string, model?: string): QmkLayout {
    const maybeSupportedKeyboard = Keyboard[QmkLayout.sanitizeInput(keyboard) as Keyboard];
    if (maybeSupportedKeyboard) {
      return new QmkLayout(
        id,
        maybeSupportedKeyboard,
        Chipset[QmkLayout.sanitizeInput(chipset ?? Chipset.unspecified) as Chipset],
        Model[QmkLayout.sanitizeInput(model ?? Model.unspecified) as Model],
      );
    }
    return new QmkLayout(
      id,
      Keyboard.unknown,
      Chipset[QmkLayout.sanitizeInput(chipset ?? Chipset.unspecified) as Chipset],
      Model[QmkLayout.sanitizeInput(model ?? Model.unspecified) as Model],
      new RangeError(`Keyboard '${keyboard}' is unknown.`),
    );
  }

  static bootstrap(): QmkLayout {
    const layout = parseOryxUrl();
    layout.model = QmkLayout._queryDomForModel();
    return layout;
  }

  static sanitizeInput(s: string): string {
    return s
      .replace(/[^A-z0-9]/g, '_')
      .trim()
      .toLowerCase();
  }

  static _ergodoxish(kbd?: Keyboard | string): boolean {
    return kbd?.startsWith('ergodox') ?? false;
  }

  static _ergodoxAndChipset(kbd: Keyboard): { keyboard: Keyboard; chipset: Chipset } {
    let chipset: Chipset;
    const keyboard: Keyboard = Keyboard.ergodox_ez;
    if (Keyboard[kbd] === Keyboard[Keyboard.ergodox_ez_st]) {
      chipset = Chipset.stm32;
    } else {
      chipset = Chipset.m32u4;
    }
    return { keyboard, chipset };
  }

  static _queryDomForModel(): Model {
    const tags = 'h1 ~ div > .tag.default';
    const active_model = '.model-toggle .entry > .active';
    let firstMatch = document.querySelector(`${tags}, ${active_model}`)?.textContent;
    if (firstMatch) {
      firstMatch = QmkLayout.sanitizeInput(firstMatch);
      return Model[firstMatch as Model];
    }
    return Model.unspecified;
  }

  update(layout?: QmkLayout): QmkLayout {
    const updated = layout ?? QmkLayout.bootstrap();
    this.id = updated.id;
    this.keyboard = updated.keyboard;
    this.chipset = updated.chipset;
    this.model = updated.model;
    this.error = updated.error;
    return this;
  }

  get geometry() {
    const blacklisted = [Model.original, Model.unspecified, Chipset.unspecified, Keyboard.unknown];
    return [this.keyboard, this.chipset, this.model]
      .filter(v => !blacklisted.includes(v))
      .filter(v => v)
      .map(v => v.toString())
      .reduce((l, r) => l + '/' + r);
  }
}

const parseOryxUrl = (): QmkLayout => {
  const [, raw_layout_geometry, layout_id] =
    window.location.href.match('https://configure.zsa.io/([^/]+)/layouts/([^/]+)') || [];
  return QmkLayout.from(layout_id, raw_layout_geometry, Chipset.unspecified, Model.unspecified);
};

export const parseGithubUrl = (url: string) => {
  const [, owner, repo, workflow_id] = url.match('https://github.com/([^/]+)/([^/]+)/actions/workflows/([^/]+)') || [];
  return { owner, repo, workflow_id };
};

export const buildGithubUrl = ({ owner, repo, workflow_id }: { owner: string; repo: string; workflow_id: string }) => {
  if (owner == undefined) {
    return '';
  }
  return `https://github.com/${owner}/${repo}/actions/workflows/${workflow_id}`;
};
