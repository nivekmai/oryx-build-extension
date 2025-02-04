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
  model: Model;

  constructor(_id: string, _keyboard: Keyboard, _chipset: Chipset, _model: Model) {
    this.id = _id;
    if (Keyboard[_keyboard]) {
      let { keyboard, chipset } = QmkLayout._ergodoxish(_keyboard)
        ? QmkLayout._ergodoxAndChipset(_keyboard)
        : {
            keyboard: Keyboard[_keyboard] ?? Keyboard.unknown,
            chipset: Chipset[_chipset] ?? Chipset.unspecified,
          };
      if (keyboard === Keyboard[Keyboard.unknown]) {
        throw new RangeError(`Keyboard '${keyboard}' is unknown. \
          If ZSA has come out with a new type of keyboard, file an support request \
          at https://github.com/nivekmai/oryx-build-extension/issues.`);
      }
      this.keyboard = keyboard;
      this.chipset = chipset;
    }
    this.model = Model[_model] ? (_model as Model) : Model.unspecified;
  }

  static from(id: string, keyboard: string, chipset: string | undefined, model: string): QmkLayout {
    return new QmkLayout(
      id,
      keyboard ? (QmkLayout.sanitizeInput(keyboard) as Keyboard) : Keyboard.unknown,
      chipset ? (QmkLayout.sanitizeInput(chipset) as Chipset) : Chipset.unspecified,
      model ? (QmkLayout.sanitizeInput(model) as Model) : Model.unspecified,
    );
  }

  static bootstrap(): QmkLayout {
    const { layout_geometry, layout_id } = parseOryxUrl();
    const model = QmkLayout._queryDomForModel();
    return QmkLayout.from(layout_id, layout_geometry ?? Keyboard.unknown, Chipset.unspecified, model);
  }

  static sanitizeInput(s: string): string {
    return s
      .replace(/[^A-z0-9]/g, '_')
      .trim()
      .toLowerCase();
  }

  static _ergodoxish(kbd: Keyboard | string | undefined): boolean {
    return kbd ? (QmkLayout.sanitizeInput(kbd as string)?.startsWith('ergodox') ?? false) : false;
  }

  static _ergodoxAndChipset(kbd: Keyboard): { keyboard: Keyboard; chipset: Chipset } {
    let chipset: Chipset, keyboard: Keyboard;
    if (Keyboard[kbd] === Keyboard[Keyboard.ergodox_ez_st]) {
      chipset = Chipset.stm32;
    } else {
      chipset = Chipset.m32u4;
    }
    keyboard = Keyboard.ergodox_ez;
    return { keyboard, chipset };
  }

  static _queryDomForModel(): string {
    const tags = 'h1 ~ div > .tag.default';
    const active_model = '.model-toggle .entry > .active';
    const firstMatch = document.querySelector(`${tags}, ${active_model}`)?.textContent;
    if (firstMatch) {
      return QmkLayout.sanitizeInput(firstMatch);
    }
    return Model.unspecified;
  }

  update(layout: QmkLayout | undefined): void {
    const updated = layout ?? QmkLayout.bootstrap();
    this.id = updated.id;
    this.keyboard = updated.keyboard;
    this.chipset = updated.chipset;
    this.model = updated.model;
  }

  get geometry() {
    const blacklisted = [Model.original, Model.unspecified, Chipset.unspecified, Keyboard.unknown];
    return [this.keyboard, this.chipset, this.model]
      .filter(v => !blacklisted.includes(v))
      .map(v => v.toString())
      .reduce((l, r) => l + '/' + r);
  }
}

const parseOryxUrl = () => {
  const [, raw_layout_geometry, layout_id] =
    window.location.href.match('https://configure.zsa.io/([^/]+)/layouts/([^/]+)') || [];
  const layout_geometry = QmkLayout.sanitizeInput(raw_layout_geometry);
  return { layout_geometry, layout_id };
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
