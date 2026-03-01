from app.core.condition_parser import ConditionParseError, evaluate_condition


def test_condition_parser_comparison_and_logical():
    assert evaluate_condition("score >= 90", {"score": 95}) is True
    assert evaluate_condition("score >= 90 and passed == true", {"score": 95, "passed": True}) is True
    assert evaluate_condition("score >= 90 or passed == true", {"score": 70, "passed": True}) is True


def test_condition_parser_rejects_nested_expressions():
    try:
        evaluate_condition("a > 1 and b > 2 and c > 3", {"a": 1, "b": 2, "c": 3})
    except ConditionParseError:
        pass
    else:
        raise AssertionError("Expected parser to reject chained logical operators")


def test_condition_parser_rejects_dynamic_property_access():
    try:
        evaluate_condition("user.score >= 10", {"user.score": 12})
    except ConditionParseError:
        pass
    else:
        raise AssertionError("Expected parser to reject dynamic property access")

