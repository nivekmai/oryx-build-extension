import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type Config = {
  owner: string;
  repo: string;
  workflow_id: string;
  token: string;
};

type ConfigStorage = BaseStorage<Config>;

const storage = createStorage<Config>(
  'config-storage-key',
  {
    owner: '',
    repo: '',
    workflow_id: '',
    token: '',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
    serialization: {
      serialize: value => JSON.stringify(value),
      deserialize: string => {
        if (string == undefined) {
          return {};
        }
        return JSON.parse(string);
      },
    },
  },
);

export const configStorage: ConfigStorage = storage;
