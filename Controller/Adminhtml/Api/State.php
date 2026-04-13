<?php
/**
 * OPcache GUI API state controller
 *
 * @author    Ilan Parmentier
 * @copyright Copyright © Amadeco. All rights reserved.
 * @license   MIT License
 */
declare(strict_types=1);

namespace Amadeco\OpcacheGui\Controller\Adminhtml\Api;

use Amnuts\Opcache\Service as OpcacheService;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Data\Form\FormKey\Validator as FormKeyValidator;
use Psr\Log\LoggerInterface;

class State extends Action implements HttpGetActionInterface
{
    private const array ALLOWED_ACTIONS = ['poll', 'reset', 'invalidate', 'invalidate_searched'];
    private const array GET_PROXY_KEYS  = ['reset', 'invalidate', 'invalidate_searched'];

    /**
     * Authorization level of a basic admin session
     *
     * @see _isAllowed()
     */
    public const string ADMIN_RESOURCE = 'Amadeco_OpcacheGui::gui_index';

    /**
     * Initialize dependencies.
     *
     * @param Context $context
     * @param JsonFactory $resultJsonFactory
     * @param FormKeyValidator $formKeyValidator
     * @param OpcacheService $opcacheService
     * @param LoggerInterface $logger
     */
    public function __construct(
        Context $context,
        protected readonly JsonFactory $resultJsonFactory,
        protected readonly FormKeyValidator $formKeyValidator,
        protected readonly OpcacheService $opcacheService,
        protected readonly LoggerInterface $logger
    ) {
        parent::__construct($context);
    }

    /**
     * Call Opcache Service actions.
     *
     * @return \Magento\Framework\Controller\ResultInterface
     */
    public function execute(): \Magento\Framework\Controller\ResultInterface
    {
        $result = $this->resultJsonFactory->create();

        $formKeyIsValid = $this->formKeyValidator->validate($this->getRequest());
        if (!$formKeyIsValid) {
            return $result->setHttpResponseCode(400)->setData([
                'success' => false,
                'error' => 'INVALID_FORM_KEY'
            ]);
        }

        try {
            $action = (string) $this->getRequest()->getParam('action', 'poll');
            if (!in_array($action, self::ALLOWED_ACTIONS, true)) {
                return $result->setHttpResponseCode(400)->setData([
                    'success' => false,
                    'error' => 'INVALID_ACTION'
                ]);
            }

            if ($action === 'reset' && !(bool)$this->opcacheService->getOption('allow_reset')) {
                return $result->setHttpResponseCode(403)->setData([
                    'success' => false,
                    'error' => 'ACTION_NOT_ALLOWED'
                ]);
            }
            if (in_array($action, ['invalidate', 'invalidate_searched'], true)
                && !(bool)$this->opcacheService->getOption('allow_invalidate')) {
                return $result->setHttpResponseCode(403)->setData([
                    'success' => false,
                    'error' => 'ACTION_NOT_ALLOWED'
                ]);
            }

            $params = [];
            switch ($action) {
                case 'reset':
                    $params['reset'] = 1;
                    break;
                case 'invalidate':
                    $file = (string) $this->getRequest()->getParam('file', '');
                    if ($file === '') {
                        return $result->setHttpResponseCode(400)->setData([
                            'success' => false,
                            'error' => 'MISSING_FILE'
                        ]);
                    }
                    $params['invalidate'] = $file;
                    break;
                case 'invalidate_searched':
                    $term = (string) $this->getRequest()->getParam('term', '');
                    if ($term === '') {
                        return $result->setHttpResponseCode(400)->setData([
                            'success' => false,
                            'error' => 'MISSING_TERM'
                        ]);
                    }
                    $params['invalidate_searched'] = $term;
                    break;
                case 'poll':
                default:
                    break;
            }

            $backup = $_GET;
            try {
                foreach (self::GET_PROXY_KEYS as $k) {
                    unset($_GET[$k]);
                }
                foreach ($params as $k => $v) {
                    if (in_array($k, self::GET_PROXY_KEYS, true)) {
                        $_GET[$k] = $v;
                    }
                }

                $service = $this->opcacheService->handle();
            } finally {
                $_GET = $backup;
            }

            return $result->setData([
                'success'   => true,
                'data' => $service->getData()
            ]);
        } catch (\Throwable $e) {
            $this->logger->error(
                'Amadeco_OpcacheGui: unhandled exception in State controller',
                ['exception' => $e]
            );
            return $result->setHttpResponseCode(500)->setData([
                'success' => false,
                'error'   => 'INTERNAL_ERROR',
                'message' => 'An internal error occurred. Please check the server logs.'
            ]);
        }
    }
}