package runner

type NextFuncParam[T any] func(data T) (T, error)
type NextHandlerParam[T any] func(next NextFuncParam[T]) NextFuncParam[T]

func NewChainParam[T any](chains ...NextHandlerParam[T]) NextFuncParam[T] {

	var next NextFuncParam[T] = func(data T) (T, error) {
		return data, nil
	}

	reverse(chains)
	for _, chain := range chains {
		next = chain(next)
	}

	return next
}

func reverse[T any](s []T) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}
