from datetime import datetime

WEEK_1_START_TIMESTAMP = 1590969600


def get_current_lm_week_number():
    week_1_start = '01/06/2020 00:00:00 UTC'
    week_1_start = datetime.strptime(week_1_start, '%d/%m/%Y %H:%M:%S %Z')
    # this is what week we're actually in
    week_number = int(1 + (datetime.utcnow() - week_1_start).days/7)
    return week_number


def get_current_lm_week_start_timestamp():
    week_number = get_current_lm_week_number()
    week_start_timestamp = WEEK_1_START_TIMESTAMP + \
        (week_number - 1) * 7 * 24 * 60 * 60
    return week_start_timestamp


def get_current_lm_week_end_timestamp():
    week_end_timestamp = int(datetime.utcnow().timestamp())
    return week_end_timestamp


def get_percent_week_passed():
    week_end_timestamp = get_current_lm_week_end_timestamp()
    week_start_timestamp = get_current_lm_week_start_timestamp()
    week_passed = (week_end_timestamp - week_start_timestamp)/(7*24*3600)
    return week_passed
