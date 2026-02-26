import logging
LOGGER = logging.getLogger(__name__)


def logger_init(_level='WARNING'):
    logging.basicConfig(format='%(asctime)s - %(message)s',
                        datefmt='%m/%d/%Y %I:%M:%S %p')
    LOGGER.setLevel(getattr(logging, _level.upper()))
